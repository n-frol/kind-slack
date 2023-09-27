/* global Promise Set */
/* eslint no-console: 0 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

const chalk = require('chalk');
const archiver = require('archiver');
const chokidar = require('chokidar');
const anymatch = require('anymatch');
const _ = require('lodash');

// resolve from project root
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 5,
    keepAliveMsecs: 3000
});
const unzipBody = querystring.stringify({
    method: 'UNZIP'
});

function relativeToGlob(glob, p) {
    var g = glob.replace(/\/?[^/]*?\*{1,2}[^/]*\/?/g, '/');
    g = path.normalize(g);
    return path.relative(g, p);
}


function getUserHome() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

function defaultLogger() {
    return console.log.apply(console, arguments);
}

var lastError = 0;
const SFCCUpload = function (opts, _log) {
    if (!opts.paths) {
        throw Error("paths is required");
    }

    var log = _log;

    if (!log) {
        log = defaultLogger;
    }

    var credentialsPromise = new Promise(function (resolve, reject) {
        var projectName = opts.project;
        var environmentName = opts.environment;
        var hasDwJson = fs.existsSync("./dw.json");

        if (opts.server) {
            resolve({
                server: opts.server,
                codeVersion: opts.codeVersion,
                username: opts.username,
                password: opts.password
            });
        } else if (hasDwJson) {
            var dwJson = require('../dw.json');
            resolve({
                server: dwJson.hostname,
                codeVersion: dwJson['code-version'],
                username: dwJson.username,
                password: dwJson.password
            });
        } else {
            if (!projectName) {
                var pkg = require(resolveApp('package.json'));
                projectName = pkg.name;
            }

            var contentsPromise = new Promise(function (resolveContents, rejectContents) {
                // get from dwre.json
                var gpgCredentialsFile = path.join(getUserHome(), '.dwre.json.gpg');
                var dwreFile;
                if (fs.existsSync(gpgCredentialsFile)) {
                    // decrypt
                    try {
                        var gpg = require('gpg');
                        gpg.decryptFile(gpgCredentialsFile, function (err, contents) {
                            resolveContents(JSON.parse(contents));
                        });
                    } catch (e) {
                        rejectContents(e);
                    }
                } else {
                    var credentialsFile = path.join(getUserHome(), '.dwre.json');
                    if (!fs.existsSync(credentialsFile)) {
                        reject('[UPLOAD] cannot find dwre.json; skipping uploads');
                        return;
                    }
                    dwreFile = JSON.parse(fs.readFileSync(credentialsFile));
                    resolveContents(dwreFile);
                }
            });

            contentsPromise.then(function (dwreFile) {
                var project = dwreFile.projects[projectName];
                if (!project) {
                    reject(`[UPLOAD] cannot find project ${projectName} in dwre.json; will not upload changes`);
                    return;
                }

                if (!environmentName) {
                    environmentName = project.defaultEnvironment;
                }

                var creds = project.environments[environmentName];

                if (!creds) {
                    reject(`[UPLOAD] cannot find credentials for env ${environmentName} in dwre.json`);
                    return;
                }

                resolve(creds);
            }, function (reason) {
                reject(reason);
            });
        }
    });

    credentialsPromise.then(function (creds) {
        var server = creds.server;
        var codeVersion = creds.codeVersion;
        var username = creds.username;
        var password = creds.password;

        const REQ_PARAMS = {
            hostname: server,
            auth: `${username}:${password}`,
            agent: httpsAgent
        };

        // eslint-disable-next-line
        var _filesToUpload = new Set();
        var paths = opts.paths;
        var ignored = opts.ignored;
        if (!ignored) {
            ignored = /(^|[/\\])\../;
        }
        var conditional = opts.conditional;
        var wait = opts.wait;
        if (!wait) {
            wait = 100;
        }

        var sourcePaths;
        var pathsToDest;

        function uploadCb() {
            var archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });
            var filesInProgress = Array.from(_filesToUpload);
            var filesToUpload = filesInProgress.map(file => {
                var globMatch = anymatch(sourcePaths, file, true);
                var glob = sourcePaths[globMatch];
                var destPath = pathsToDest[glob];
                var dest = path.normalize(`${destPath}/${relativeToGlob(glob, file)}`);

                return { src: file, dest: dest };
            });

            var now = (new Date()).getTime();

            if (now - lastError < (60 * 1000)) {
                return;
            }

            var uploadPath = `/on/demandware.servlet/webdav/Sites/Cartridges/${codeVersion}/_upload-${now}.zip`;

            var output = https.request(Object.assign({
                method: 'PUT',
                path: uploadPath
            }, REQ_PARAMS), (res) => {
                if (res.statusCode >= 300) {
                    lastError = (new Date()).getTime();
                    log("Upload error (" + res.statusCode + '); backing off uploads for 60 seconds');
                    return;
                }
                res.setEncoding('utf8');
                res.on('data', (chunk) => {});
                res.on('end', () => {
                    var unzipRequest = https.request(Object.assign({
                        method: 'POST',
                        path: uploadPath,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Content-Length': Buffer.byteLength(unzipBody)
                        }
                    }, REQ_PARAMS), (unzipRes) => {
                        log(chalk.green(`[UPLOAD] uploaded to ${server} code version ${codeVersion}`));
                        for (var i = 0; i < filesInProgress.length; i++) {
                            if (i > 10) {
                                log(chalk.green(`\t...${filesInProgress.length - i} more...`));
                                break;
                            }
                            log(chalk.green('\t' + filesInProgress[i]));
                        }
                        unzipRes.on('data', (chunk) => {});
                        unzipRes.on('end', () => {
                            var deleteRequest = https.request(Object.assign({
                                method: 'DELETE',
                                path: uploadPath,
                                headers: {
                                    Connection: 'close'
                                }
                            }, REQ_PARAMS), (deleteRes) => {
                                deleteRes.on('data', (chunk) => {});
                                deleteRes.on('end', () => {});
                                deleteRes.on('close', () => {});
                            });
                            deleteRequest.on('error', () => {});
                            deleteRequest.end();
                        });
                    });
                    unzipRequest.on('error', () => {});
                    unzipRequest.write(unzipBody);
                    unzipRequest.end();
                });
            });

            archive.pipe(output);
            filesToUpload.forEach(f => archive.file(f.src, { name: f.dest }));

            archive.on('warning', function (err) {
                if (err.code === 'ENOENT') {
                    // log warning
                } else {
                    // throw error
                    throw err;
                }
            });

            output.on('error', function (e) {
                log('problem with request: ' + e.message);
                process.exit(1);
            });

            output.on('close', function () {
            });

            archive.finalize();
            _filesToUpload = new Set();
        }

        function debounce(fn, time) {
            var timer = null;
            return function () {
                if (timer) {
                    clearTimeout(timer);
                }

                timer = setTimeout(() => {
                    if (conditional && typeof conditional === 'function' && !conditional()) {
                        // wait for conditional
                        // eslint-disable-next-line
                        timer = setTimeout(arguments.callee, time);
                        return;
                    }
                    timer = null;
                    fn();
                }, time);
            };
        }

        const upload = debounce(uploadCb, wait);

        var transformedPaths;
        sourcePaths = paths.map(p => p.src);
        pathsToDest = _.mapValues(_.keyBy(paths, 'src'), p => p.dest);
        transformedPaths = sourcePaths.map(p => resolveApp(p));

        chokidar.watch(transformedPaths, {
            ignored: ignored,
            ignoreInitial: true,
            cwd: appDirectory
        }).on('all', (event, p) => {
            if (['change', 'add'].indexOf(event) !== -1) {
                _filesToUpload.add(p);
                upload();
            }
        });
    }, function (reason) {
        // credentials failed to load for some reason
        log(chalk.red(reason));
    });
};

module.exports = SFCCUpload;
