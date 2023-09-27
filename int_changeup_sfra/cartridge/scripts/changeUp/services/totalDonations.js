'use strict';

var Logger = require('dw/system/Logger');

/**
 * Gets the ChangeUp Service.
 * @returns {Object} The ChangeUp Service.
 */
function getService() {
    return require('dw/svc/LocalServiceRegistry').createService('com.changeup.api', {
        createRequest: function (svc, params) {
            svc.setRequestMethod('GET');
            svc.setCachingTTL(86400);
            svc.setURL(svc.URL + '/partner/total_donations');
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

/**
 * Logic to determine the total donation to date amount.
 *
 * @param {Object} config - json config object from the config model
 * @returns {string} total - string representation of the total amount donated to date
 */
function getTotalDonationsToDate(config) {
    var total = '';
    var result = null;

    if (config.total_donations_toggle !== true) {
        return '';
    }

    // need to test for session.custom so the unit test doesnt blow up
    if (session.custom && session.custom.total_donation) {
        total = session.custom.total_donation;
    } else {
        result = getService().call();
        if (result && result.ok) {
            var resultObj;
            try {
                resultObj = JSON.parse(result.object.text);
            } catch (e) {
                Logger.error('total_donation error while parsing response: ' + e.message);
            }

            if (resultObj.data && resultObj.data.total_cents) {
                var totalCents = resultObj.data.total_cents;
                total = (totalCents / 100).toFixed(2);

                // need to test for session.custom so the unit test doesn't blow up
                if (session.custom) {
                    session.custom.total_donation = total;
                }
            }
        } else if (result && result.errorMessage) {
            Logger.error('total_donations error: ' + result.errorMessage);
        }
    }

    if (total) {
        var totalVal = Number(total);
       
        var start = 0;
        if (config.total_donations_start) {
            start = Number(config.total_donations_start);
        }

        if (start > totalVal) {
            return '';
        }
        total = totalVal.toFixed(2);
    }

    return total;
}

module.exports = {
    getTotalDonationsToDate: getTotalDonationsToDate
};
