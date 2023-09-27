/**
 * uploadFilesToSFTP.js
 *
 * Exports a function for use as a script job step for uploading XML files to
 * the appropriate SFTP server.
 */

// SFCC API imports
var File = require('dw/io/File');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

// Script module imports
var SFTPService = require('*/cartridge/scripts/batch/services/SFTPService');

/**
 * Exports all files in the export directory have a prefix that matches the
 * prefix parameter from the job step setup. After each file is uploaded, it is
 * then deleted from the IMPEX directory.
 *
 * @param {Object} params - A parameters object holding parameters defined in
 *      the Job Step definition, and configured in the Jobs module in BM.
 * @param {string} params.directory - The name of the directory that the export
 *      file is found in.
 * @param {string} params.prefix - A file prefix for the export file. This needs
 *      to match the export file prefix configured in the step to create the
 *      export file from SFCC records.
 * @param {string} [params.remotepath] - An optional parameter to specify the
 *      upload path on the SFTP server.
 * @param {string} params.servicenamme - The ID of the SFCC SFTP service to use.
 * @param {string}
 */
function uploadFiles(params) {
    var log = Logger.getLogger('int_batch', 'int_batch');
    log.info('Impact Product Feed: Getting service: {0}', params.servicename);
    var svc = SFTPService.getService(params.servicename);
    var dir = new File(File.IMPEX + File.SEPARATOR + params.directory);
    var prefix = params.prefix;

    // Get a reference to any files with a matching prefix.
    var filesInDir = dir.listFiles(function(f) {
        return f.getName().substr(0, prefix.length) === prefix;
    });

    // If no files were found, return the custom status.
    if (empty(filesInDir) || filesInDir.size() === 0) {
        var noFileMsg = 'No files found for upload with prefix: {0}';
        log.info(noFileMsg, prefix);
        return new dw.system.Status(255, 'NO_FILES_FOUND');
    }

    // Check for remote path configurations.
    var baseDir = svc.configuration.credential.custom.ftpBaseDir;
    var remotePath = null;
    if (!empty(params.remotepath)) {
        remotePath = params.remotepath;
    }
    if (!empty(baseDir)) {
        remotePath = baseDir + '/' + remotePath;
    }

    // Loop through any matching files and upload them to the specified location.
    for (var i = 0; i < filesInDir.size(); i++) {
        var file = filesInDir[i];

        // Concatenate the destination file path with the file name.
        var fileDest = !empty(remotePath) ? remotePath + File.SEPARATOR +
            file.getName() : file.getName();

        // Call the SFTP service to upload the file.
        var resp = svc.call({
            exportFile: file,
            exportPath: fileDest
        });

        if (!resp.ok) {
            var errMsg = 'Cannot upload file: ' +
                file.fullPath + '\n\t' +
                Object.keys(resp).map(function (key) {
                    return '\n\t' + key + ': ' + resp[key];
                }).join();
            log.error(errMsg);
            return new Status(Status.ERROR);
        }

        log.info('Uploaded ' + file.fullPath + ' to ' + fileDest);
        file.remove();
    }
}

module.exports = {
    uploadFiles: uploadFiles
};
