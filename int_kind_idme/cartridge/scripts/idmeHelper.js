/* global */

'use strict';

/**
 * idmeHelper.js
 *
 * Provides exported helper functions for performing IDme related
 * business logic and keeping the controllers 'thin'. This module's helper
 * methods provide a wrapper for easily making calls to the IdmeService
 * This wrapper is responsible for handles error logging for exception conditions.
 *
 * @module idmeHelper
 */

 // SFCC API Includes
var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');


/**
 * Loggs all the keys from an object to the error logs for better error messages.
 *
 * @param {Ojbect} e - An error Object to be logged to the SFCC error logs.
 * @param {string[]} [args] - Any optional arguments to be passed to the SFCC
 * Logger instance methods as the args param.
 */
function logIdmeError(e, args) {
    var idmeLogger = Logger.getLogger('idme', 'idme');
    var errMsg = 'ERROR in idmeHelper.js';

    Object.keys(e).forEach(function (key) {
        errMsg += '\n' + key + ': ' + e[key];
    });

    if (!args) {
        idmeLogger.error(errMsg);
    } else {
        idmeLogger.error(errMsg, args);
    }
}

/**
 * A convenience method for getting an error with an 'unexpected error' message
 * for displaying to the user. This method also logs the passed in result object
 * to the error logs.
 *
 * @param {Object} [err] - An error result to log to the SFCC error logs.
 * @returns {{success: bool, status: string, message: string}} - Returns a view
 *      data error object that is already in the correct format to be passed
 *      back to the client
 */
function getUnexpectedError(err) {
    // If an error was passed, log it to the loginradius category error logs.
    if (err) {
        logIdmeError(err);
    }

    return {
        success: false,
        status: 'ERROR',
        message: Resource.msg('idme.error.unexpectederror',
            'idme', null)
    };
}

module.exports = {
    getUnexpectedError: getUnexpectedError
};
