'use strict';

/**
 * Error message handling
 */
var Logger = require('dw/system/Logger');
var cdpmLogger = Logger.getLogger('paymentOperator', 'paymentOperator');
var Resource = require('dw/web/Resource');

/**
 * Log error & return object with error information
 *
 * @param {dw.util.HashMap} responseData - paygate response
 * @param {string} scope - error scope
 * @returns {Object} - error info
 */
function logError(responseData, scope) {
    var message = null;
    var map = responseData;

    if (!map) {
        return { error: true };
    }

    var code = map.get('Code');
    var description = map.get('Description');

    message = 'Code ' + code + ' : ' + description;
    cdpmLogger.error(message);

    if (map.get('ErrorText')) {
        message = map.get('ErrorText');
    } else if (code && scope === 'PaygateError') {
        message = getErrorMessage(code.substr(4)); // eslint-disable-line no-use-before-define
    } else if (code) {
        message = getErrorMessageCategory(code.substr(1, 3)); // eslint-disable-line no-use-before-define
    } else {
        message = 'Error during authorization process of payment using socket call!';
    }

    return {
        error: false,
        LogMessage: message
    };
}

/**
 * get localization of error code part 1
 *
 * @param {string} code - error code
 * @returns {string} - error message
 */
function getErrorMessage(code) {
    var defaultMessage =
        Resource.msg('paymentoperator.error.details.default',
            'paymentoperatorerrordetails', null);

    var message =
        Resource.msg('paymentoperator.error.details.' + code,
            'paymentoperatorerrordetails', defaultMessage);
    return message;
}


/**
 * get localization of error code part 2
 *
 * @param {string} code - error code
 * @returns {string} - error message
 */
function getErrorMessageCategory(code) {
    var defaultMessage =
        Resource.msg('paymentoperator.error.category.default',
            'paymentoperatorerrorcategory', null);

    return Resource.msg('paymentoperator.error.category.' + code, 'paymentoperatorerrorcategory', defaultMessage);
}

exports.logError = logError;
