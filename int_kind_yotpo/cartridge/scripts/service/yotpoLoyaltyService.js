/* global empty */

'use strict';

// SFCC API includes
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');

// Custom Logger Instance
var yotpoLogger = Logger.getLogger('yotpo', 'loyaltyapi');
var site = Site.getCurrent();
var enableDebugLogging = !empty(site
    .getCustomPreferenceValue('yotpoLoyaltyDebuggingEnabled')) ?
    site.getCustomPreferenceValue('yotpoLoyaltyDebuggingEnabled') : false;

var YotpoLoyalty = require('*/cartridge/models/loyalty');

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
 * call, and returns them as a formated query string.
 *
 * @param {Object} args - The key/value pair containing any arguments passed to
 *      the service call.
 * @returns {string} - Returns the formated query string parameter string.
 */
function getURLParams(args) {
    let urlParams = '';

    if (!empty(args.apiPath)) {
        urlParams += args.apiPath;
    }
    return urlParams;
}


/**
 * Gets the service instance from the local service registry and configures it
 * for use.
 *
 * @return {dw.svc.HTTPService} - Returns the idme.http service instance.
 */
function getHttpService() {
    let yotpoLoyaltyService = LocalServiceRegistry.createService('yotpoLoyalty.http', {
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
                yotpoLogger.info('yotpo.http called with params: {0}', args);
            }

            // The Globally Unique Identifier found in the "Settings" section of your Yotpo loyalty admin.
            // Account API key can be found in the "Settings" section of your Yotpo loyalty admin.
            if (!empty(args.xguid) && !empty(args.xapikey)) {
                svc.addHeader('x-guid', args.xguid);
                svc.addHeader('x-api-key', args.xapikey);
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
                yotpoLogger.info('yotpoLoyalty.http response: {0}', client.text);
            }

            return client.text;
        },

        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return yotpoLoyaltyService;
}


function serviceCall(body, apiPath, requestMethod) {
    const isServiceEnabled = !empty(site
        .getCustomPreferenceValue('yotpoLoyaltyEnabled')) ?
        site.getCustomPreferenceValue('yotpoLoyaltyEnabled') : false;

    if (!isServiceEnabled) {
        return { };
    }

    var yotpo = new YotpoLoyalty();
    let svc = getHttpService();

    let res = svc.call({
        url: yotpo.serviceEndpoint,
        apiPath: apiPath,
        requestMethod: requestMethod,
        xguid: yotpo.xguid,
        xapikey: yotpo.xapikey,
        callData: JSON.stringify(body)
    });
    return res;
}


function newsletterSignUp(body) {
    return serviceCall(body, '/actions', "POST");
}

function createOrder(body) {
    return serviceCall(body, '/orders', "POST");
}

function refundOrder(body) {
    return serviceCall(body, '/refunds', "POST");
}

function createUpdateCustomer(body) {
    return serviceCall(body, '/customers', "POST");
}

module.exports = {
    newsLetterSignUp: newsletterSignUp,
    createOrder: createOrder,
    createUpdateCustomer: createUpdateCustomer,
    refundOrder: refundOrder
};
