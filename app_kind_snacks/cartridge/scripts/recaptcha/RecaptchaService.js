/**
 * Recaptcha Service Registry Definition
 *
 * @module recaptcha/RecaptchaService
 */

/**
 * @ignore
 */
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/**
 * Returns an instance of the 'recaptcha.http' Service
 *
 * @return {dw.svc.Service} - Service object for the reCaptcha service
 */
exports.get = function () {
    return LocalServiceRegistry.createService('recaptcha.http', {
        createRequest: function (svc, args) {
            svc.addParam('secret', args.secret);
            svc.addParam('response', args.response);
        },
        filterLogMessage: function (msg) {
            return msg;
        },
        parseResponse: function (svc, client) {
            return JSON.parse(client.text);
        }
    });
};
