'use strict';

/**
 * xmlExports/exportHelpers.js
 *
 * Exports helper functions for use in the Impact & Adlucent XML product feed
 * export jobs.
 */

// SFCC API imports
var Calendar = require('dw/util/Calendar');
var File = require('dw/io/File');
var Logger = require('dw/system/Logger');
var StringUtils = require('dw/util/StringUtils');

var log = Logger.getLogger('int_batch', 'int_batch');
var logPrefix = 'int_batch - exportHelpers.js - at {0}:\n\t';

/**
 * Gets the filename and directory arguments from the aruments object, checks if
 * each exists, creates the directory and file if needed, and returns the File
 * class instance for the export XML file.
 *
 * @param {Object} args - The arguments object that is passed to the job
 *      callback function.
 * @param {boolean} args.addTimeStampToFileName - A flag indicating if a
 *      date should be added to the end of the name of the export file.
 * @param {string} args.jobName - The name of the export job - adlucent or .
 * @param {string} args.fileName - The configured file ame from the BM Job Step.
 * @param {string} args.directory - The subdirectory within the IMPEX directory
 *      that has been configured in BM for saving the export file to.
 * @returns {dw.io.File|null} - Returns the file instance for the export file to be
 *      written to or Null if there is an error condition.
 */
function getExportFile(args) {
    var logMethod = 'getExportFile()';
    var logMsg = logPrefix + 'Called getExportFile: {0}';
    var directory = !empty(args.directory) ? args.directory : 'xmlExport';
    var fileName = !empty(args.fileName) ? args.fileName : '';
    var saveDirPath = File.IMPEX + File.SEPARATOR + directory;
    var saveDirectory = new File(saveDirPath);
    var file = null;
    log.info(logMsg, args);

    // If conafigured, add a timestamp to the filename
    if (typeof args.addTimeStampToFileName === 'boolean' &&
        args.addTimeStampToFileName === true
    ) {
        // Append the date to the filename
        var cal = new Calendar(new Date());
        fileName += StringUtils.formatCalendar(cal, 'yyyy-MM-dd');
    }
    fileName += '.xml';

    // Check if the directory needs to be created.
    if (!saveDirectory.exists()) {
        // Try to make the directory if it doesn't exist.
        if (!saveDirectory.mkdir()) {
            log.error(logPrefix + 'Unable to create directory: {1}', logMethod, saveDirPath);
        }
    } else if (!saveDirectory.isDirectory()) {
        // If there is a file with the same name as the directory name,
        // then remove the file.
        logMsg = logPrefix + 'ERROR in exportProducts.js at getExportFile:' +
            '\n\tThere is a file with the same name as the directory specified: {0}' +
            '\n\tAttempting to remove file...';
        log.warn(logMsg, saveDirPath);

        try {
            if (!saveDirectory.remove()) {
                log.error(logPrefix +
                    'Unable to remove file from IMPEX directory: {0}',
                    logMethod,
                    saveDirPath
                );
            } else {
                log.warn(logPrefix + 'File {0} was removed successfully.', saveDirPath);
                // Try to make the directory.
                if (!saveDirectory.mkdir()) {
                    log.error(logPrefix + 'Unable to create directory: {0}', logMethod, saveDirPath);
                }
            }
        } catch (e) {
            logMsg = logPrefix + 'ERROR getting the export file:';
            logMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();

            log.error(logMsg, logMethod);
            return null;
        }
    }

    // Get a reference to the file.
    file = new File(saveDirectory, fileName);

    // Check if the file exists
    if (file.exists()) {
        var msg = 'File with name {0} already exists in the IMPEX directory.';

        try {
            if (!file.remove()) {
                log.error('Unable to remove export with the same name: {0}',
                    saveDirPath + File.SEPARATOR + fileName);
                return null;
            }
            log.warn(msg + '\nDuplicate file removed {0}.',
                        saveDirPath + File.SEPARATOR + fileName);

            // Reset the reference to point at the desired export file location.
            file = new File(saveDirectory, fileName);
        } catch (e) {
            logMsg = logPrefix + 'ERROR getting the export file:';
            logMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            log.error(logMsg, logMethod);

            return null;
        }
    }

    return file;
}

/**
 * Gets a proper product class based on what the jobName job parameter is set to.
 *
 * @param {Object} args - The argumnets passed to the job.
 * @param {string} args.jobName - The name of the job which should match the name
 *      of the job specific directory used to get the proper product model class.
 * @returns {ProductRecord} - Returns the ExportProduct class for the job execution.
 */
function getProductClass(args) {
    var dirName = !empty(args.jobName) ? args.jobName : 'xmlExports';
    var ProductRecord = require('*/cartridge/scripts/batch/jobs/' + dirName + '/productRecord');

    return ProductRecord;
}

module.exports = {
    getExportFile: getExportFile,
    getProductClass: getProductClass
};
