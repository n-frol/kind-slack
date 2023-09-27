/**
 * Batch Job Component for uploading files in directory to an FTP site
 */

var File = require('dw/io/File');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Logger = require('dw/system/Logger');


/**
 * Upload files using an (S)FTP Service
 *
 * @input params.servicename service framework name for FTP service
 * @input params.directory string directory to search for files in
 * @input params.prefix string prefix of files to query for upload
 * @input params.remotepath
 */
exports.uploadFiles = function(params) {
    var log = Logger.getLogger('int_batch');
    var svc = ServiceRegistry.get(params.servicename);

    var dir = new File(File.IMPEX + '/src/' + params.directory);
    var prefix = params.prefix;

    var filesInDir = dir.listFiles(function(f) {
        return f.getName().substr(0, prefix.length) === prefix;
    });

    if (empty(filesInDir) || filesInDir.size() === 0) {
        log.info('No files found for upload');
        return new dw.system.Status(255, 'NO_FILES_FOUND');
    }

    var baseDir = svc.configuration.credential.custom.ftpBaseDir;
    var remotePath = null;
    if (!empty(params.remotepath)) {
        remotePath = params.remotepath;
    }
    if (!empty(baseDir)) {
        remotePath = baseDir + '/' + remotePath;
    }

    for (var i = 0; i < filesInDir.size(); i++) {
        var file = filesInDir[i];

        var fileDest = !empty(remotePath) ? remotePath + '/' + file.getName() : file.getName();
        svc.setOperation('putBinary', [fileDest, file]);
        var resp = svc.call();

        if (!resp.OK || !resp.object) {
            log.error('Cannot upload file ' + file.fullPath);
            return new dw.system.Status(dw.system.Status.ERROR);
        }

        log.info('Uploaded ' + file.fullPath + ' to ' + fileDest);
        file.remove();
    }
};
