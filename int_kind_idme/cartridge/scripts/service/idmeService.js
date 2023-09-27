/* global empty */

'use strict';

// SFCC API includes
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');

// Custom Logger Instance
var idmeLogger = Logger.getLogger('idme', 'idme');
var site = Site.getCurrent();
var enableDebugLogging = !empty(site
    .getCustomPreferenceValue('idmeDebuggingEnabled')) ?
    site.getCustomPreferenceValue('idmeDebuggingEnabled') : false;

var Idme = require('*/cartridge/models/idme');


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
    var logMsg = '';

    if (typeof response !== 'string') {
        Object.keys(response).forEach(function (key) {
            logMsg += '\n' + key + ': ' + response[key];
        });
    } else {
        return response;
    }

    return logMsg;
}


/**
 * Gets any query parameters from the arguments object supplied to the service
 * call, and returns them as a formated query string.
 *
 * @param {Object} args - The key/value pair containing any arguments passed to
 *      the service call.
 * @returns {string} - Returns the formated query string parameter string.
 */
function getURLParams(args) {
    var urlParams = '';

    if (!empty(args.apiPath)) {
        urlParams += args.apiPath;
    }

    if (!empty(args.access_token)) {
        urlParams += '?access_token=' + args.access_token;
    }

    if (!empty(args.scope)) {
        urlParams += '&scope=' + args.scope;
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
    var idmeService = LocalServiceRegistry.createService('idme.http', {
        /**
         * @param {dw.svc.Service} svc - The service instance for the call.
         * @param {Object} args - Parameters given to the call method.
         * @param {string} [args.requestMethod] - The HTTP verb to be used for
         *      the request to the LoginRadius API.
         * @returns {Object} - Request object to give to the execute method.
         */
        createRequest: function (svc, args) {
            var contentType = !empty(args.contentTypeHeader) ?
                args.contentTypeHeader : 'application/json';
            var requestMethod = !empty(args.requestMethod) ?
                args.requestMethod : 'GET';

            if (enableDebugLogging) {
                idmeLogger.info('idme.http called with params: {0}', args);
            }

            // If adding the access token as an Authorization Bearer token was
            // specified in the arguments, then add the header.
            if (!empty(args.accessTokenHeader)) {
                svc.addHeader(
                    'Authorization', 'Bearer ' + args.accessTokenHeader);
            }

            var URL = args.url;
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
                idmeLogger.info('idme.http response: {0}', client.text);
            }

            return client.text;
        },

        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return idmeService;
}

function getIdmeAccessToken(redirectUri, code, state) {
    var idme = new Idme();
    var svc = getHttpService();
    var apiSecret = idme.clientSecret;
    var clientId = idme.clientId;

    var res = svc.call({
        url: idme.serviceEndpoint,
        apiPath: '/oauth/token',
        requestMethod: "POST",
        callData: JSON.stringify({
            code: code,
            client_id: clientId,
            client_secret: apiSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });
    return !empty(res.object) ? JSON.parse(res.object) :
        JSON.parse(res.errorMessage);
}

function getIdmeUserProfile(accessToken, scope) {
    var idme = new Idme();
    var svc = getHttpService();
    var result = svc.call({
        url: idme.serviceEndpoint,
        requestMethod: 'GET',
        apiPath: '/api/public/v3/attributes.json',
        access_token: accessToken,
        scope: scope
    });
    var parsedResp = !empty(result.object) ? JSON.parse(result.object) :
        JSON.parse(result.errorMessage);

    idmeLogger.info('INFO: getIdmeUserProfile response: {0}',
        getLogMsgFromResponse(parsedResp));

    return parsedResp;
}

module.exports = {
    getIdmeAccessToken: getIdmeAccessToken,
    getIdmeUserProfile: getIdmeUserProfile
};
