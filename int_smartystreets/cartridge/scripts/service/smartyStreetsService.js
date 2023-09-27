/* global empty */

'use strict';

/**
 * SmartyStreets API integration service definition.
 *
 * Used to access the SmartyStreets US street address verification API:
 *  - https://smartystreets.com/docs/cloud/us-street-api
 */

// SFCC API includes
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');

// Custom Logger Instance
var ssLogger = Logger.getLogger('smartystreets', 'smartystreets');
var errPrefix = 'ERROR calling smartystreets.http service: ';

/**
 * Gets the service instance from the local service registry and configures it
 * for use.
 * @return {dw.svc.HTTPService} - Returns the HTTPService instance for the
 *      smartystreets.http service.
 */
function getService() {
    var ssService = LocalServiceRegistry.createService('smartystreets.http', {
        /**
         * @param {dw.svc.HTTPService} svc - The service instance.
         * @param {Object} args - Any arguments passed in the call to the
         *      service.call method.
         * @param {string} [args.requestMethod] - The HTTP verb to be used for
         *      the request to the SmartyStreets API.
         */
        createRequest: function (svc, args) {
            var argFields = Object.keys(args);
            var serviceCred = svc.getConfiguration().getCredential();
            var apiAuthId = serviceCred.getUser();
            var apiAuthToken = serviceCred.getPassword();

            // Log the missing credentials.
            if (empty(apiAuthId) || empty(apiAuthToken)) {
                ssLogger.error(errPrefix + 'Missing credentials for service');
            }

            var fieldMap = {
                dwFields: [
                    'addressee',
                    'address1',
                    'city',
                    'state',
                    'postalCode'
                ],
                ssFields: [
                    'addressee',
                    'street',
                    'city',
                    'state',
                    'zipcode'
                ]
            };

            // Add a default ID to easily identify the address if returned.
            svc.addParam('input_id', 'original');

            // Default to http verb 'GET'.
            if (!args.requestMethod || args.requestMethod !== 'POST') {
                args.requestMethod = 'GET';
            }

            // Add the customer's name to the call
            if (!empty(args.firstName) && !empty(args.lastName)) {
                svc.addParam(args.firstName + ' ' + args.lastName, 'addressee');
            }

            // Add any other included parameters to the call.
            fieldMap.dwFields.forEach(function (field, i) {
                if (argFields.indexOf(field > -1) && !empty(args[field])) {
                    if (field === 'address1') {
                        var street = args.address1 + ', ' + args.address2;
                        svc.addParam('street', street);
                    }
                    svc.addParam(fieldMap.ssFields[i], args[field]);
                }
            });

            // Add the ID and API token to for authentication.
            svc.addParam('auth-id', apiAuthId);
            svc.addParam('auth-token', apiAuthToken);

            // Add Headers to the request.
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('charset', 'utf-8');
            svc.setRequestMethod(args.requestMethod);
        },

        parseResponse: function (svc, res) {
            var resData;

            if (res.statusCode === 200 && res.text) {
                resData = JSON.parse(res.text);

                // Log the successful response data.
                ssLogger.info('SmartyStreets response: {0}', res.text);
            } else {
                // Log the service call failure.
                var logMsg = errPrefix + Object.keys(res).map(function (key) {
                    return '\n\t' + key + ': ' + res[key];
                }).join();
                ssLogger.error(logMsg);

                resData = {
                    statusCode: res.statusCode,
                    errMsg: res.errorText
                };
            }
            return resData;
        },

        filterLogMessage: function (msg) {
            ssLogger.info(msg);
            return msg;
        }
    });

    return ssService;
}

module.exports = {
    getService: getService
};
