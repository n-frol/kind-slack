'use strict';

/**
 * Send the ChangeUp Config.
 * @returns {Object} The ChangeUp Config Servie.
 */
function sendConfig() {
    return require('dw/svc/LocalServiceRegistry').createService('com.changeup.api', {
        createRequest: function (svc, params) {
            svc.setRequestMethod('POST');
            svc.setCachingTTL(86400);
            svc.setURL(svc.URL + '/organization/ui-config/cartridge');
            svc.addHeader('content-type', 'application/json');
            svc.addHeader('x-api-key', require('dw/system/Site').current.preferences.custom.changeupApiKey);

            return params;
        },
        parseResponse: function (svc, res) {
            return res;
        },
        getRequestLogMessage: function (request) {
            return JSON.stringify(request);
        },
        getResponseLogMessage: function (response) {
            return response.text;
        }
    });
}

module.exports = {
    sendConfig: sendConfig
};