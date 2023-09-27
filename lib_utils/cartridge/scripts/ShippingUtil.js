/* global empty */
'use strict';

/**
 * ShippingUtil.js
 *
 * Provides various Shipping Util methods
 */

// SFCC system class imports.
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

/**
 * Gets the tracking URL based on the carrier
 * @param {string} carrier: the carrier code
 * @param {string} trackingNumber: the shipment tracking number
 * @return {string} trackingURL
 */
function getTrackingURL(carrier, trackingNumber) {
    if (!empty(carrier)) {
        var CarrierObject = CustomObjectMgr.getCustomObject('ShippingCarriers', carrier);

        if (!empty(CarrierObject) && !empty(CarrierObject.custom.trackingURL)) {
            return CarrierObject.custom.trackingURL.replace('{trackingNumber}', trackingNumber);
        }
    }

    return false;
}

module.exports = {
    getTrackingURL: getTrackingURL
};
