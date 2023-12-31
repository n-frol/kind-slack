/* global request */
/**
 * Recaptcha
 *
 * @module recaptcha/Recaptcha
 */

/**
 * @ignore
 */
var Status = require('dw/system/Status');

var RecaptchaService = require('~/cartridge/scripts/recaptcha/RecaptchaService');

var Logger = require('dw/system/Logger');
var log = Logger.getLogger("recaptcha", "recaptcha");

/**
 * @typedef RecaptchaResult
 * @type {Object}
 * @property {dw.system.Status} status - did the call succeed
 * @property {Object} value - response/value object relevant to the call
 */

/**
 *
 * @static
 * @param {string} recaptchaResponse - The response code generated by the reCaptcha widget
 * @returns {boolean} Valid submission or not
 */
exports.validateRecaptchaSubmission = function (recaptchaResponse) {
    var svc = RecaptchaService.get();

    var secret = svc.configuration.credential.password;

    var resp = svc.call({
        secret: secret,
        response: recaptchaResponse,
        remoteip: request.httpRemoteAddress
    });

    if (resp.error && resp.status === "SERVICE_UNAVAILABLE") {
        return { status: new Status(Status.ERROR) };
    }

    var reply = JSON.stringify(resp.object);
    log.info("ValidateRecaptchaSubmission" + reply);

    return resp.object;
};
