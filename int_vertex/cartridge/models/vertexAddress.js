/* global empty */

'use strict';

/**
 * vertexAddress.js
 *
 * This file exports a single module that represents an address for a call to
 * the Vertex tax calculation service. The model class provides null checking
 * each field and a standardized output that fits the format needed for making
 * calls to the Vertex service.
 *
 * @module VertexAddress
 */

/**
 * A class representing an address in a format used for making a call to the
 * Vertex tax calcualtion service.
 *
 * @param {dw.order.OrderAddress|dw.catalog.Store} address - An ship-to,
 *      bill-to, or ship-from address for one or all of the shipments in a
 *      LineItemCtnr. This can either be an OrderAddress or a Store since the
 *      ship-from address for taxation purposes is stored in a dw.catalog.Store
 *      system object.
 * @constructor
 */
function VertexAddress(address) {
    this.streetAddress1 = !empty(address) && !empty(address.address1) ?
        address.address1 : '';
    this.streetAddress2 = !empty(address) && !empty(address.address2) ?
        address.address2 : '';
    this.city = !empty(address) && !empty(address.city) ?
        address.city : '';
    this.country = !empty(address) && !empty(address.countryCode) ?
        address.countryCode.value : '';
    this.postalCode = !empty(address) && !empty(address.postalCode) ?
        address.postalCode : '';
    this.mainDivision = !empty(address) && !empty(address.stateCode) ?
        address.stateCode : '';
}

/**
 * Gets the LocationType instance from the webreferences2 packages WSDL
 * generated class definitions, and populates it from the local member address
 * data properties.
 *
 * @param {Object} wsRef - The current webreferences2 Object instance that can
 *      be used to access the webreferences2 namespaced class definitions.
 * @returns {dw.ws.WebReference2} - Returns the instance of the LocationType
 * @memberof VertexAddress
 */
VertexAddress.prototype.toXml = function (wsRef) {
    var location = new wsRef.LocationType();

    location.setStreetAddress1(this.streetAddress1);
    location.setCity(this.city);
    location.setCountry(this.country);
    location.setMainDivision(this.mainDivision);
    location.setPostalCode(this.postalCode);
    if (!empty(this.streetAddress2)) {
        location.setStreetAddress2(this.streetAddress2);
    }

    return location;
};

/**
 * If all of the fields in the address have a valid value then the method
 * returns true, otherwise it will return false.
 *
 * @returns {bool} - A value indicating if the address is valid for sending to
 *      the Vertex web service.
 * @memberof VertexAddress
 */
VertexAddress.prototype.isValid = function () {
    var instance = this;
    var isValid = true;

    ['streetAddress1', 'streetAddress2', 'city', 'country',
        'mainDivision', 'postalCode'
    ].forEach(function (attr) {
        if (instance[attr] === '') {
            isValid = false;
        }
    });

    return isValid;
};

module.exports = VertexAddress;
