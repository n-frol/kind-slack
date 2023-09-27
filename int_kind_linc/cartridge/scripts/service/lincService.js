/* global empty */

"use strict";

// SFCC API includes
var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
var Logger = require("dw/system/Logger");
var Site = require("dw/system/Site");

// Custom Logger Instance
var lincLogger = Logger.getLogger("linc", "linc");
var site = Site.getCurrent();
var enableDebugLogging = !empty(
    site.getCustomPreferenceValue("lincDebuggingEnabled")
)
    ? site.getCustomPreferenceValue("lincDebuggingEnabled")
    : false;

var Linc = require("*/cartridge/models/linc");

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
    var logMsg = "";

    if (typeof response !== "string") {
        Object.keys(response).forEach(function (key) {
            logMsg += "\n" + key + ": " + response[key];
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
    var urlParams = "";

    if (!empty(args.apiPath)) {
        urlParams += args.apiPath;
    }

    if (!empty(args.public_id)) {
        urlParams += "?public_id=" + args.public_id;
    }

    if (!empty(args.order_id)) {
        urlParams += "&order_id=" + args.order_id;
    }

    return urlParams;
}

/**
 * Gets the service instance from the local service registry and configures it
 * for use.
 *
 * @return {dw.svc.HTTPService} - Returns the linc.http service instance.
 */
function getHttpService() {
    var lincService = LocalServiceRegistry.createService("linc.http", {
        /**
         * @param {dw.svc.Service} svc - The service instance for the call.
         * @param {Object} args - Parameters given to the call method.
         * @param {string} [args.requestMethod] - The HTTP verb to be used for
         *      the request to the LoginRadius API.
         * @returns {Object} - Request object to give to the execute method.
         */
        createRequest: function (svc, args) {
            var contentType = !empty(args.contentTypeHeader)
                ? args.contentTypeHeader
                : "application/json";
            var requestMethod = !empty(args.requestMethod)
                ? args.requestMethod
                : "GET";

            if (enableDebugLogging) {
                lincLogger.info("linc.http called with params: {0}", args);
            }

            // If adding the access token as an Authorization Bearer token was
            // specified in the arguments, then add the header.
            if (!empty(args.access_token)) {
                svc.addHeader("Authorization", "Bearer " + args.access_token);
            }

            var URL = args.url;
            URL += getURLParams(args);

            svc.setRequestMethod(requestMethod);
            svc.setURL(URL);
            svc.addHeader("charset", "utf-8");
            svc.addHeader("Content-Type", contentType);
            svc.addHeader("X-API-ORIGIN", "DEMANDWARE");

            // If call data for the body of the request was passed, then return
            // it so that it will be added to the call.
            if (!empty(args.callData)) {
                return args.callData;
            }

            return {};
        },

        parseResponse: function (svc, client) {
            if (enableDebugLogging) {
                lincLogger.info("linc.http response: {0}", client.text);
            }

            return client.text;
        },

        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return lincService;
}

function createOrder(body) {
    var linc = new Linc();
    var svc = getHttpService();
    var result = svc.call({
        url: linc.serviceEndpoint,
        requestMethod: "POST",
        apiPath:
            "/order?shop_id=" +
            site.getCustomPreferenceValue("lincClientShopId"),
        access_token: linc.clientSecret,
        callData: JSON.stringify(body)
    });
    try {
        let parsedResp = !empty(result.object)
            ? JSON.parse(result.object)
            : JSON.parse(result.errorMessage);

        if (enableDebugLogging) {
            lincLogger.info(
                "INFO: create order response: {0}",
                getLogMsgFromResponse(parsedResp)
            );
        }
    } catch (e) {
        lincLogger.info("ERROR: create order response: {0}", body.order_id);
    }
}

function createFulfillment(body) {
    var linc = new Linc();
    var svc = getHttpService();
    var result = svc.call({
        url: linc.serviceEndpoint,
        requestMethod: "POST",
        apiPath:
            "/fulfillment?shop_id=" +
            site.getCustomPreferenceValue("lincClientShopId"),
        access_token: linc.clientSecret,
        callData: JSON.stringify(body)
    });
    let parsedResp = !empty(result.object)
        ? JSON.parse(result.object)
        : JSON.parse(result.errorMessage);

    if (enableDebugLogging) {
        lincLogger.info(
            "INFO: fulfillment response: {0}",
            getLogMsgFromResponse(parsedResp)
        );
    }
}

function cancelOrder(orderId) {
    var linc = new Linc();
    var svc = getHttpService();
    var result = svc.call({
        url: linc.serviceEndpoint,
        requestMethod: "DELETE",
        apiPath: "/order/" + orderId,
        access_token: linc.clientSecret,
        public_id: linc.publicId,
        callData: JSON.stringify({})
    });
    let parsedResp = !empty(result.object)
        ? JSON.parse(result.object)
        : JSON.parse(result.errorMessage);

    if (enableDebugLogging) {
        lincLogger.info(
            "INFO: fulfillment response: {0}",
            getLogMsgFromResponse(parsedResp)
        );
    }
}

function getOrder(orderId) {
    var linc = new Linc();
    var svc = getHttpService();
    var result = svc.call({
        url: linc.serviceEndpoint,
        requestMethod: "GET",
        apiPath: "/order",
        access_token: linc.clientSecret,
        public_id: linc.publicId,
        order_id: orderId,
        callData: JSON.stringify({})
    });
    let parsedResp = !empty(result.object)
        ? JSON.parse(result.object)
        : JSON.parse(result.errorMessage);

    if (enableDebugLogging) {
        lincLogger.info(
            "INFO: Existing order response: {0}",
            getLogMsgFromResponse(parsedResp)
        );
    }
    return parsedResp;
}

module.exports = {
    order: createOrder,
    fulfillment: createFulfillment,
    cancel: cancelOrder,
    getOrder: getOrder
};
