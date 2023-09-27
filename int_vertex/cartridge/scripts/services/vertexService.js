/* global webreferences2, empty */

'use strict';

/**
 * vertexService.js
 *
 * This module provides a service definition for making calls to the Vertex
 * O-Series tax calculation API.
 *
 * @module VertexService
 */

// SFCC API imports.
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/**
 * A class that can be used to make calls to the Vertex Tax Calculation web
 * service to lookup tax jurisdictions and calculate taxes on basket items.
 *
 * @constructor
 */
function VertexService() {
    // Initialize the service by defining the callbacks.
    this.service = LocalServiceRegistry.createService('vertex.http', {
        /**
         * The callback method for the initialization of the ServiceClient
         * SFCC service framework object instance.
         *
         * @returns {dw.ws.Port} - Returns the configured service Port instance.
         */
        initServiceClient: function () {
            // Initialize the service instance.
            var webReference = webreferences2.VertexTaxCalculate;
            var servicePort = webReference.getService('CalculateTaxWSService60',
                'CalculateTax60');
            this.webReference = webReference;

            // Return the instance of dw.ws.Port for accessing the WSDL call
            // specification classes.
            return servicePort;
        },

        /**
         * The createRequest callback for the creation of a service request.
         * This callback is used to configure the service and parse any
         * parameters.
         *
         * @param {dw.svc.SOAPService} svc - The SOAP service instance that
         *      has been created by the service framework.
         * @param {Object} args - An arguments object containing the arguments
         * Object that was passed to the
         * @param {VertexRequest} args.vertexRequest - An instance of the
         *      VertexRequest class.
         * @returns {Object} - Returns the request object to pass to the service
         *      call.
         */
        createRequest: function (svc, args) {
            if (empty(args.vertexRequest)) {
                return { success: false };
            }

            var credentials = svc.getConfiguration().getCredential();
            var vertexRequest = args.vertexRequest;
            var wsObject = vertexRequest.toXml(credentials, this.webReference);

            return wsObject;
        },

        /**
         * Executes the service call and returns the reuslt.
         *
         * @param {dw.svc.SOAPService} svc - The configured SOAPService class
         *      instance.
         * @param {Object} requestObject - The request object that was setup and
         *      returned in the createRequest callback.
         * @returns {Object} - Returns the deferred object instance that
         *      will resolve to the results of the service call.
         */
        execute: function (svc, requestObject) {
            var svcClient = svc.serviceClient;

            // Call the operation/method defined in the WSDL.
            return svcClient.calculateTax60(requestObject);
        },

        /**
         * The callback function that is invoked when the Service Framework
         * recieves the response from the web service call.
         *
         * @param {dw.svc.SOAPService} svc - The service object instance that
         *      made the call to the service endpoint.
         * @param {Object} response - An unparsed response from a service call.
         * @returns {Object} - Returns a parsed response from a service call.
         */
        parseResponse: function (svc, response) {
            var resp = response;
            /**
             *  @todo: Return a standard format response by parsing either here
             *         or at the calculateTax function level.
             */
            return resp;
        }
    });
}

/**
 * This method makes the call to the Vertex service to calculate the taxes
 * against the VertexRequest instance that was created from the current basket,
 * or from an order.
 *
 * @param {VertexRequest} vertexRequest - An instance of the VertexRequest
 *      class that is validated (vertexRequest.valid === true);
 * @returns {{success: bool, result: Object }} - Returns the results of the Vertex service call.
 * @memberof VertexService
 */
VertexService.prototype.calculateTax = function (vertexRequest) {
    if (!vertexRequest.valid) {
        return { vertexRequest: { valid: false, lineItemsArray: [] } };
    }

    var callResult = this.service.call({ vertexRequest: vertexRequest });

    return callResult;
};

module.exports = VertexService;
