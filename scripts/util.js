/* eslint no-console: 0 */

var fs = require('fs');
var path = require('path');
var chalk = require('chalk');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (...paths) => path.resolve.apply(path, [appDirectory, ...paths]);

/*
 * Cleans include paths for sass loader
 * Hack - this could be fixed if SFRA use webpack ~ resolution
 */
function cleanIncludePaths(options, scssIncludePaths) {
    var newOptions = options;
    if (options && options.includePaths) {
        var myNodeModules = resolveApp("node_modules");
        newOptions.includePaths = options.includePaths.map(p => {
            if (p.indexOf('node_modules') !== -1) {
                return path.join(myNodeModules, p.substr(p.indexOf('node_modules') + 12));
            }
            return path;
        });
        newOptions.includePaths = newOptions.includePaths.concat(scssIncludePaths);
    }
    return newOptions;
}

function updateSassSourceMaps(options, isProduction) {
    var newOptions = options;
    if (!isProduction && options) {
        options.sourceMap = true;
        options.minimize = false;
    }
    return newOptions;
}

/*
 * HACK - we need this because SFRA does not properly use webpack, requires
 * node_modules installed in it's own directory, and the plugins have
 * hardcoded mappings to this directory as well.
 *
 * This cleans scss include paths if present
 *
 * @param {Object} config Webpack configuration to clean
 */
function cleanScssConfig(config, scssIncludePaths, isProduction) {
    var c = config;

    if (c.module && c.module.rules) {
        c.module.rules = c.module.rules.map(r => {
            var newRule = r;
            newRule.options = cleanIncludePaths(r.options, scssIncludePaths);
            if (r.use && Array.isArray(r.use)) {
                newRule.use = r.use.map(r2 => {
                    if (r2.loader && ['sass-loader'].indexOf(r2.loader) !== -1) {
                        r2.options = cleanIncludePaths(r2.options, scssIncludePaths);
                    }
                    if (r2.loader && ['sass-loader', 'postcss-loader', 'css-loader'].indexOf(r2.loader) !== -1) {
                        if (!r2.options) {
                            r2.options = {};
                        }
                        r2.options = updateSassSourceMaps(r2.options, isProduction);
                    }
                    return r2;
                });
            } else if (r.use) {
                newRule.use.options = cleanIncludePaths(r.use.options, scssIncludePaths);
            }
            if (r.loader && ['sass-loader', 'postcss-loader', 'css-loader'].indexOf(r.loader) !== -1) {
                if (!newRule.options) {
                    newRule.options = {};
                }
                newRule.options = updateSassSourceMaps(newRule.options, isProduction);
            }
            return newRule;
        });
    }

    return config;
    // scss include paths
}

/*
 * 1. Read from our package.json "paths".
 * 2. For each one see if it contains a webpack configuration
 * 3. If so, require the webpack config, changing directories to support
 *    path resolution from the perspective of the loaded webpack config
 * 4. Add our own webpack "aliases" to their config to ensure proper resolution
 *    of paths from other cartridges, node_modules, etc
 * 5. finally add the configuration to our list
 *
 * @param {Object} paths
 * @param {Object} jsAliases
 * @param {Object} scssAliases
 * @param {boolean} isProduction
 * @returns {Array} array of processed webpack configurations
 */
exports.processWebpackFiles = function ({
    paths, jsAliases, scssAliases,
    scssIncludePaths, isProduction
}) {
    var webpackConfigurations = [];

    Object.entries(paths).forEach(([key, value]) => {
        var webpackPath = resolveApp(value, "webpack.config.js");
        if (fs.existsSync(webpackPath)) {
            var oldcwd = process.cwd();

            // require the webpack configure
            // need to change directory as some make assumptions about
            // the current working directory
            process.chdir(path.dirname(webpackPath));

            // sgmf-scripts does not allow CWD changing due to caching the value
            // in a constant; thus this HACK
            if (require.cache[require.resolve('sgmf-scripts/lib/helpers')]) {
                delete require.cache[require.resolve('sgmf-scripts/lib/helpers')];
                delete require.cache[require.resolve('sgmf-scripts')];
            }
            var configs = require(webpackPath);
            process.chdir(oldcwd);
            configs = Array.isArray(configs) ? configs : [configs];

            configs = configs.map(config => {
                var newConfig = config;
                var resolve = config.resolve || {};
                var alias = resolve.alias || {};
                // by default assume JS compilation
                // if the config name is scss use our scss aliases instead
                var packageAliases = jsAliases;
                if (config.name === 'scss') {
                    packageAliases = scssAliases;
                }

                Object.entries(packageAliases).forEach(([name, aliasPath]) => {
                    alias[name] = resolveApp(aliasPath);
                });
                resolve.alias = alias;
                newConfig.resolve = resolve;

                if (!isProduction) {
                    newConfig.mode = 'development';
                    newConfig.devtool = 'cheap-module-source-map';
                }

                newConfig.optimization = config.optimization || {};
                newConfig.optimization.noEmitOnErrors = true;
                newConfig = cleanScssConfig(newConfig, scssIncludePaths, isProduction);
                return newConfig;
            });

            webpackConfigurations.push.apply(webpackConfigurations, configs);
        }
    });

    return webpackConfigurations;
};

exports.clearConsole = function () {
    process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
};

exports.summarizeMultiCompilerStats = function (stats) {
    var json = stats.toJson();
    json.children.forEach(s => {
        // eslint-disable-next-line
        var color = s.errors.length ? chalk.red.bind(chalk) :
            (s.warnings.length ? chalk.yellow.bind(chalk) : chalk.green.bind(chalk));
        var outputPath = path.relative('', s.outputPath);
        console.log(color(outputPath));

        s.assets.filter(a => a.emitted).forEach(asset => {
            console.log(color('\t', asset.name, `${asset.size}b`));
        });
    });
};
