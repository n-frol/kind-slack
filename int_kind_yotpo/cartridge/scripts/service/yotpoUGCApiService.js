/* global empty */

'use strict';

// SFCC API includes
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var StringUtils = require('dw/util/StringUtils');

// Custom Logger Instance
var yotpoLogger = Logger.getLogger('yotpo', 'UgcApi');
var enableDebugLogging = false;


/*eslint-disable */
/**
 * Takes a JS object and returns a string with each key/value property pair
 * on a new line for log formatting.
 *
 * @param {string} response - An object to get a string for in order to log it
 *      to the custom error logs.
 * @returns {Object} - Returns a string created from all of the object's
 *      key / value properties.
 */
function getLogMsgFromResponse(response) {
    let logMsg = '';

    if (typeof response !== 'string') {
        Object.keys(response).forEach(function (key) {
            logMsg += '\n' + key + ': ' + response[key];
        });
    } else {
        return response;
    }

    return logMsg;
}
/* eslint-enable */

/**
 * Gets any query parameters from the arguments object supplied to the service
 * call, and returns them as a formatted query string.
 *
 * @param {Object} args - The key/value pair containing any arguments passed to
 *      the service call.
 * @returns {string} - Returns the formatted query string parameter string.
 */
function getURLParams(args) {
    let urlParams = '';

    if (!empty(args.utoken)) {
        urlParams += '?utoken=' + args.utoken;
    }
    return urlParams;
}


/**
 * Gets the service instance from the local service registry and configures it
 * for use.
 *
 * @return {dw.svc.HTTPService} - Returns the yotpoUgcApi.http service instance.
 */
function getHttpService() {
    let yotpoLoyaltyService = LocalServiceRegistry.createService('yotpoUgcApi.http', {
        /**
         * @param {dw.svc.Service} svc - The service instance for the call.
         * @param {Object} args - Parameters given to the call method.
         * @param {string} [args.requestMethod] - The HTTP verb to be used for
         *      the request to the LoginRadius API.
         * @returns {Object} - Request object to give to the execute method.
         */
        createRequest: function (svc, args) {
            let contentType = !empty(args.contentTypeHeader) ?
                args.contentTypeHeader : 'application/json';
            let requestMethod = !empty(args.requestMethod) ?
                args.requestMethod : 'GET';

            if (enableDebugLogging) {
                yotpoLogger.info('yotpoUgcApi.http called with params: {0}', args);
            }

            let URL = args.url;
            URL += getURLParams(args);

            svc.setRequestMethod(requestMethod);
            svc.setURL(URL);
            svc.addHeader('charset', 'utf-8');
            svc.addHeader('Content-Type', contentType);
            svc.addHeader('X-API-ORIGIN', 'DEMANDWARE');

            // If call data for the body of the request was passed, then return
            // it so that it will be added to the call.
            if (!empty(args.callData)) {
                return args.callData;
            }

            return {};
        },

        parseResponse: function (svc, client) {
            if (enableDebugLogging) {
                yotpoLogger.info('yotpoUgcApi.http response: {0}', client.text);
            }

            return client.text;
        },

        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return yotpoLoyaltyService;
}

function getYatpoServiceConfig() {
    var ExportOrderModel = require('*/cartridge/scripts/model/orderexport/exportOrderModel');
    var exportOrderModelInstance = new ExportOrderModel();
    var yotpoConfigurations = exportOrderModelInstance.loadAllYotpoConfigurations();
    return yotpoConfigurations[0];
}

function getOauthToken() {
    var config = getYatpoServiceConfig();
    var authenticationModel = require('*/cartridge/scripts/model/authentication/authenticationModel');
    var status;

    try {
        status = authenticationModel.authenticate(config.custom.appKey, config.custom.clientSecretKey);
    } catch (e) {
        status = {
            errorResult: true,
            updatedUTokenAuthCode: null
        };
    }

    return status.updatedUTokenAuthCode;
}

function retrieveListOfUnsubscribers() {
    var config = getYatpoServiceConfig();
    var svc = getHttpService();
    var url = svc.getConfiguration().getCredential().getURL();
    // GET https://api.yotpo.com/apps/YOUR_APP_KEY/unsubscribers?utoken=YOUR_UTOKEN
    var path = StringUtils.format('{0}/apps/{1}/unsubscribers', url, config.custom.appKey);
    var utoken = getOauthToken();
    var res = svc.call({
        url: path,
        utoken: utoken,
        requestMethod: "GET",
        callData: ""
    });
    return res;
}

function removeSetOfEmails(email) {
    var config = getYatpoServiceConfig();
    var svc = getHttpService();
    var url = svc.getConfiguration().getCredential().getURL();
    // POST https://api.yotpo.com/apps/YOUR_APP_KEY/unsubscribers/mass_create
    var path = StringUtils.format('{0}/apps/{1}/unsubscribers/mass_create', url, config.custom.appKey);
    var utoken = getOauthToken();
    var res = svc.call({
        url: path,
        requestMethod: "POST",
        callData: JSON.stringify({
            utoken: utoken,
            email_list: {
                1: [email]
            }
        })
    });
    return res;
}

module.exports = {
    retrieveListOfUnsubscribers: retrieveListOfUnsubscribers,
    removeSetOfEmails: removeSetOfEmails
};
