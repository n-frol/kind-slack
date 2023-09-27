
/**
 * Batch Job Component for cleaning files of a certain age from folders
 */

var File = require('dw/io/File');
var Logger = require('dw/system/Logger');

/**
 * Remove files based on regex and maximum age in days
 *
 * @input params.directory string Directory to search (ex: /Impex/log)
 * @input params.regexp string Regexp To match against files
 * @input params.maxAgeDays int maximum age of files to ignore
 */
exports.cleanupFiles = function(params) {
    var log = Logger.getLogger('int_batch');

    var directory = new File(params.directory);
    var maxAgeDays = parseInt(params.maxAgeDays);
    var maxAgeMillis = maxAgeDays * 24 * 60 * 60 * 1000;
    var regexp = new RegExp(params.regexp);

    var now = new Date();
    var oldest = now.getTime() - maxAgeMillis;

    if (!directory.isDirectory()) {
        log.info(directory.fullPath + ' is not a directory');
        return new dw.system.Status(255, 'NO_FILES_FOUND');
    }

    var filesToDelete = directory.listFiles(function(file) {
        return regexp.test(file.getName()) && file.lastModified() < oldest;
    });

    if (filesToDelete.length === 0) {
        log.info('No files found for download');
        return new dw.system.Status(255, 'NO_FILES_FOUND');
    }

    for (var i = 0; i < filesToDelete.length; i++) {
        var fileToDelete = filesToDelete[i];
        log.info('Deleting ' + fileToDelete.fullPath);
        fileToDelete.remove();
    }
};
