/**
 * Batch Job Component for downloading files in directory from and FTP service
 */

var File = require('dw/io/File');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Logger = require('dw/system/Logger');


/**
 * Download files using an (S)FTP Service
 *
 * @input params.servicename service framework name for FTP service
 * @input params.directory string directory to download files to
 * @input params.prefix string prefix of files to query for download
 * @input params.remotpath (optional) string path on remote server to query files for prefix
 *  (this comes after the service base directory)
 */
exports.downloadFiles = function(params) {
    var log = Logger.getLogger('int_batch');
    var svc = ServiceRegistry.get(params.servicename);
    var baseDir = svc.configuration.credential.custom.ftpBaseDir;

    var prefix = params.prefix;

    svc.setThrowOnError();

    var directory = new File(File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + params.directory);

    if (!directory.exists()) {
        directory.mkdir();
    }

    if (!directory.isDirectory()) {
        log.error(directory.fullPath + ' dest path not found or is not a directory');
        return new dw.system.Status(dw.system.Status.ERROR);
    }

    var remotePath = null;
    if (!empty(params.remotepath)) {
        remotePath = params.remotepath;
    }
    if (!empty(baseDir)) {
        remotePath = baseDir + '/' + remotePath;
    }

    if (!empty(remotePath)) {
        svc.setOperation('list', [remotePath]);
    } else {
        svc.setOperation('list', []);
    }
    var resp = svc.call();

    if (!resp.OK || !resp.object) {
        log.error('Cannot list directory on server: ' + remotePath);
        return new dw.system.Status(dw.system.Status.ERROR);
    }

    var files = resp.object;
    var foundFiles = 0;
    for (var i = 0; i < files.length; i++) {
        if (files[i].directory) {
            continue;
        }

        var filename = files[i].name;

        if (filename.length < prefix.length || filename.substr(0, prefix.length) !== prefix) {
            continue;
        }

        foundFiles += 1;

        var file = new File(File.IMPEX + '/src/' + params.directory + '/' + filename);

        var remoteFilename = filename;

        if (!empty(remotePath)) {
            remoteFilename = remotePath + '/' + remoteFilename;
        }

        svc.setOperation('getBinary', [remoteFilename, file]);
        resp = svc.call();

        if (!resp.OK) {
            log.error('Cannot download file' + remoteFilename + ' to ' + file.fullPath);
            return new dw.system.Status(dw.system.Status.ERROR);
        }

        log.info('Downloaded ' +  remoteFilename + ' to ' + file.fullPath);

        svc.setOperation('del', [remoteFilename]);
        resp = svc.call();

        if (!resp.OK) {
            log.error('Cannot delete file on server: ' + remoteFilename);
            return new dw.system.Status(dw.system.Status.ERROR);
        }
    }

    if (foundFiles === 0) {
        log.info('No files found for download');
        return new dw.system.Status(255, 'NO_FILES_FOUND');
    }
};
