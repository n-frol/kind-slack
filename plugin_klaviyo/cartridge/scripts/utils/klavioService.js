/* global empty */

/**
 * todo: Replace klavio utils file functions with this service file.
 */


'use strict';

// SFCC API includes
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils')

// Custom Logger Instance
var serviceLogger = Logger.getLogger('Klaviyo', 'Klavio Service');
var enableDebugLogging = false;
var baseUrl = "https://a.klaviyo.com/api";
var apiKey = Site.getCurrent().getCustomPreferenceValue('klaviyo_api_key');


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

    if (!empty(args.api_key)) {
        urlParams += '?api_key=' + args.api_key;
    }

    return urlParams;
}


/**
 * Gets the service instance from the local service registry and configures it
 * for use.
 *
 * @return {dw.svc.HTTPService} - Returns the service instance.
 */
function getHttpService() {
    var localService = LocalServiceRegistry.createService('KlaviyoSubscriptionService', {
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
                serviceLogger.info('KlaviyoSubscriptionService called with params: {0}', args);
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
                serviceLogger.info('KlaviyoSubscriptionService response: {0}', client.text);
            }

            return client.text;
        },

        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return localService;
}

function serviceCall(body, apiPath, requestMethod) {
    var svc = getHttpService();
    var res = svc.call({
        url: baseUrl,
        apiPath: apiPath,
        api_key: apiKey,
        requestMethod: requestMethod,
        callData: JSON.stringify(body)
    });
    return res;
}

/**
 * Gets all of the emails, phone numbers, and push tokens for profiles in a given list or segment
 *
 * @link https://apidocs.klaviyo.com/reference/lists-segments#get-members
 * @return {dw.svc.Result}
 */
function getSubscribeProfilesToList(list_or_segment_id) {
    var path = StringUtils.format('/v2/group/{0}/members/all', list_or_segment_id);
    return serviceCall("", path, "GET");
}

/**
 * Unsubscribes and removes profiles from a list.
 *
 * @param {string} listId
 * @param {string} email
 * @return {dw.svc.Result}
 */
function deleteSubscribe(listId, email) {
    var body = {
        emails: [email],
        push_tokens: ''
    };
    var path = StringUtils.format('/v2/list/{0}/subscribe', listId);
    return serviceCall(body, path, "DELETE");
}


module.exports = {
    subscribeProfilesToList: getSubscribeProfilesToList,
    deleteSubscribe : deleteSubscribe
};
