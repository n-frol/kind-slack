'use strict';

/**
 * Gets the ChangeUp Service.
 * @returns {Object} The ChangeUp Service.
 */
function getService() {
    return require('dw/svc/LocalServiceRegistry').createService('com.changeup.api', {
        createRequest: function (svc, params) {
            svc.setRequestMethod('GET');
            svc.setCachingTTL(86400);
            svc.setURL(svc.URL + '/cause/search');
            svc.addHeader('content-type', 'application/json');
            svc.addHeader('x-api-key', require('dw/system/Site').current.preferences.custom.changeupApiKey);
            svc.addParam('q', params.query);
            svc.addParam('requireVerified', params.requireVerified);
            if (params.exclude) {
                svc.addParam('exclude', params.exclude);
            }

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
 * Searches for the organization.
 * @param {Object} queryObj Object to query
 * @returns {Object} Search results.
 */
function search(queryObj) {
    var result = null;
    var res = [];

    if (queryObj && queryObj.query) {
        result = getService().call({
            query: queryObj.query,
            exclude: queryObj.exclude,
            requireVerified: queryObj.requireVerified
        });
    }

    if (result && result.ok) {
        var orgs = JSON.parse(result.object.text);

        for (var idx = 0; idx < orgs.length; idx++) {
            var id = (orgs[idx].id != undefined && orgs[idx].id != null && orgs[idx].id != '') ? orgs[idx].id : '""';
            var name = (orgs[idx].attributes.name != undefined && orgs[idx].attributes.name != null && orgs[idx].attributes.name != '') ? orgs[idx].attributes.name : '""';
            var city = (orgs[idx].attributes.city != undefined && orgs[idx].attributes.city != null  && orgs[idx].attributes.city != '') ? orgs[idx].attributes.city : '""';
            var state = (orgs[idx].attributes.state != undefined && orgs[idx].attributes.state != null &&  orgs[idx].attributes.state != '')  ? orgs[idx].attributes.state : '';
            var stateName = (state.name != undefined && state.name != null &&  state.name != '')  ? state.name : '""';
            var description = (orgs[idx].attributes.description != undefined && orgs[idx].attributes.description != null && orgs[idx].attributes.description != '') ? orgs[idx].attributes.description : '""';
            var logo = (orgs[idx].attributes.logo != undefined && orgs[idx].attributes.logo != null && orgs[idx].attributes.logo != '') ? orgs[idx].attributes.logo : '""';
                res.push({
                    uuid: id,
                    name: name,
                    location: city + ', ' + stateName,
                    mission_statment: description,
                    display: name + ' - ' + city+ ', ' + stateName,
                    logo: logo
                });
        }
    } else if (result && result.errorMessage) {
        res.push({
            error: result.errorMessage
        });
    }

    return res;
}

module.exports = search;
