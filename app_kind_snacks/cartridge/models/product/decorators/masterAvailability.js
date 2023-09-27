/* global empty */
'use strict';

/**
 * Set the availability of a master product based on the availability of its variants
 */

var Resource = require('dw/web/Resource');
var availability = require('*/cartridge/models/product/decorators/availability');
var variationHelpers = require('*/cartridge/scripts/helpers/variationHelpers');

/**
 *
 * @param {Object} availabilities - Availability object to check status against
 * @param {Object} master - An object representing the variation master
 * @return {array} messages - The resulting array of messages
 */
function getCombinedMessage(availabilities, master) {
    var messages;

    switch (true) {
        // Check if master's availability matches up with that of its variants
        // If these two match, we can reasonably assume the outOfStock value does as well
        case (availabilities.availabile === master.available && availabilities.inStock === master.inStock):
            messages = master.availability.messages;
            break;
        case availabilities.inStock && availabilities.available:
            messages = [
                Resource.msg('label.instock', 'common', null)
            ];
            break;
        case availabilities.available:
            messages = [
                Resource.msg('label.available', 'common', null)
            ];
            break;
        default:
            messages = [
                Resource.msg('label.not.available', 'common', null)
            ];
            break;
    }

    return messages;
}

module.exports = function (object, quantity, minOrderQuantity, availabilityModel, variationModel) {
    if (!empty(variationModel) && !empty(variationModel.variants)) {
        // Initialize availabilities object
        var combinedAvailabilities = {
            available: false,
            outOfStock: true,
            inStock: false
        };

        // Pull master properties for the "availability" field
        var masterObj = Object.create(null);
        availability(masterObj, quantity, minOrderQuantity, availabilityModel);

        var visibleVariants = variationHelpers.methods.getVisibleVariants(variationModel); // We only want to check against visible variants, since they're the once you can choose between on the PDP

        // Get availabilities of all the visible variants (the ones they can select from on the PDP)
        if (!empty(visibleVariants)) {
            var len = visibleVariants.length;
            for (var i = 0; i < len; i++) {
                var variantObj = Object.create(null); // Object to get variant availability into
                var variant = visibleVariants[i];

                availability(variantObj, null, variant.minOrderQuantity.value, variant.availabilityModel);

                combinedAvailabilities.available = combinedAvailabilities.available || variantObj.available; // Master is available if at least one product is available
                combinedAvailabilities.outOfStock = combinedAvailabilities.outOfStock && variantObj.outOfStock; // Master is out of stock if all variants are out of stock
                combinedAvailabilities.inStock = combinedAvailabilities.inStock || variantObj.inStock; // Master is in stock if at least one product is in stock
            }
        }

        Object.defineProperty(object, 'availability', {
            enumerable: true,
            writable: true,
            value: {
                messages: getCombinedMessage(combinedAvailabilities, masterObj),
                inStockDate: masterObj.availability.inStockDate
            }
        });
        Object.defineProperty(object, 'available', {
            enumerable: true,
            writable: true,
            value: combinedAvailabilities.available
        });
        Object.defineProperty(object, 'outOfStock', {
            enumerable: true,
            writable: true,
            value: combinedAvailabilities.outOfStock
        });
        Object.defineProperty(object, 'inStock', {
            enumerable: true,
            writable: true,
            value: combinedAvailabilities.inStock
        });
    } else {
        // If the variationModel is somehow empty, we can just use the master's info
        availability(object, quantity, minOrderQuantity, availabilityModel);
    }
};
