
'use strict';
// eslint-disable-next-line no-unused-vars
var AddressModel = require('*/cartridge/models/address');
// eslint-disable-next-line no-unused-vars
var ProductLineItemsModel = require('*/cartridge/models/productLineItems');
// eslint-disable-next-line no-unused-vars
var ShippingMethodModel = require('*/cartridge/models/shipping/shippingMethod');

var base = module.superModule;

module.exports = function (shipment, customer) {
    base.apply(this, [shipment, customer]);
    // eslint-disable-next-line no-use-before-define
    this.matchingAddressId = getAssociatedAddress(shipment, customer);
    this.giftTo = shipment.custom.giftRecipient;
    this.giftFrom = shipment.custom.giftSender;
};

/**
 * Returns the matching address ID or UUID for a shipping address
 * @param {dw.order.Shipment} shipment - line items model
 * @param {Object} customer - customer model
 * @return {string|boolean} returns matching ID or false
*/
function getAssociatedAddress(shipment, customer) {
    var address = shipment ? shipment.shippingAddress : null;
    var matchingId;
    var anAddress;

    if (!address) return false;

    // If we still haven't found a match, then loop through customer addresses to find a match
    if (!matchingId && customer && customer.addressBook && customer.addressBook.addresses) {
        for (var j = 0, jj = customer.addressBook.addresses.length; j < jj; j++) {
            anAddress = customer.addressBook.addresses[j];

            if (anAddress && anAddress.isEquivalentAddress === 'function' && anAddress.isEquivalentAddress(address)) {
                matchingId = anAddress.ID;
                break;
            }
        }
    }

    return matchingId;
}
