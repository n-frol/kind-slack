/* global empty */
'use strict';

var base = module.superModule;

/**
 * Address class that represents an orderAddress
 * @param {dw.order.OrderAddress} addressObject - User's address
 * @constructor
 */
function address(addressObject) {
    base.apply(this, [addressObject]);

    if (!empty(addressObject) && Object.prototype.hasOwnProperty.call(address, "custom") &&
    Object.hasOwnProperty.call(addressObject.custom, 'email')) {
        this.address.email = addressObject.custom.email;
    }
    if (!empty(addressObject) && Object.hasOwnProperty.call(addressObject, 'companyName') && (addressObject.companyName !== 'undefined')) {
        this.address.companyName = addressObject.companyName;
    }
}

module.exports = address;
