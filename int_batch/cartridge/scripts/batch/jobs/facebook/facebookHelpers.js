'use strict';

/**
 * facebookHelpers.js
 *
 * Exports helper functions for creating the Facebook product feed.
 */

// SFCC API imports
var File = require('dw/io/File');
var Logger = require('dw/system/Logger');

// Module level declarations
var log = Logger.getLogger('int_batch', 'int_batch');
var logPrefix = 'int_batch - facebookHelpers.js - at {0}:\n\t';

/**
 * Gets the .csv export file to write product data to.
 *
 * @param {object} args - An arguments object containing any arguments passed from the Job-Schedule
 *      setup of the step 'custom.batch.facebookFeed'.
 * @param {string} args.filename - The configured filename from the BM Job Step.
 * @param {string} args.directory - The subdirectory within the IMPEX directory that has been
 *      configured in BM for saving the export file to.
 * @returns {dw.io.File|null}-  Returns the file instance for the export file to be written to, or
 *      Null if there is an error condition.
 */
function getExportFile(args) {
    var logMethodName = 'getExportFile()';
    var logMsg = logPrefix + 'Getting .csv export file.';
    log.info(logMsg, logMethodName);
    var directory = !empty(args.directory) ? args.directory : 'adlucent';
    var filename = !empty(args.prefix) ? args.prefix : '';
    var saveDirPath = File.IMPEX + File.SEPARATOR + directory;
    var saveDirectory = new File(saveDirPath);
    var file = null;

    // Append the date to the filename
    filename += '.csv';

    // Check if the directory needs to be created.
    if (!saveDirectory.exists()) {
        // Try to make the directory if it doesn't exist.
        if (!saveDirectory.mkdir()) {
            log.error(logPrefix + 'Unable to create directory: {1}', logMethodName, saveDirPath);
        }
    } else if (!saveDirectory.isDirectory()) {
        // If there is a file with the same name as the directory name,
        // then remove the file.
        logMsg = logPrefix + 'File exists with the specified directory name: {1}.' +
            '\n\tAttempting to remove file...';
        log.warn(logMsg, logMethodName, saveDirPath);

        // Attempt to remove the file with the same name as the export directory.
        try {
            if (!saveDirectory.remove()) {
                log.error(
                    logPrefix + 'Unable to remove file from IMPEX directory: {1}',
                    logMethodName,
                    saveDirPath
                );
            } else {
                log.warn(logPrefix + 'File {1} was removed successfully.', logMethodName, saveDirPath);
                // Try to make the directory.
                if (!saveDirectory.mkdir()) {
                    log.error(logPrefix + 'Unable to create directory: {1}', logMethodName, saveDirPath);
                }
            }
        } catch (e) {
            // Log the entire error object.
            logMsg = logPrefix + 'ERROR attempting to create export file:';
            logMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            });
            log.error(logMsg, logMethodName);
            return null;
        }
    }

    // Get a reference to the file.
    file = new File(saveDirectory, filename);
    // Check if the file exists
    if (file.exists()) {
        var msg = logPrefix + 'File with name {1} already exists in the IMPEX directory.';
        try {
            if (!file.remove()) {
                log.error(logPrefix + 'Unable to remove export with the same name: {1}',
                    saveDirPath + File.SEPARATOR + filename);
                return null;
            }

            log.warn(msg + '\nDuplicate file removed {1}.', logMethodName,
                saveDirPath + File.SEPARATOR + filename);

            // Reset the reference to point at the desired export file location.
            file = new File(saveDirectory, filename);
        } catch (e) {
            logMsg = logPrefix + 'ERROR in exportProducts at beforeStep():';
            logMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            });
            log.error(logMsg, logMethodName);
            return null;
        }
    }

    return file;
}

module.exports = {
    getExportFile: getExportFile
};
