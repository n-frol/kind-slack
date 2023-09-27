'use strict';

var collections = require('*/cartridge/scripts/util/collections');

/**
 * get the total price for the product line item
 * @param {dw.order.ProductLineItem} lineItem - API ProductLineItem instance
 * @returns {Object} an object containing the product line item total info.
 */
function getTotalPrice(lineItem) {
    var price;

    price = lineItem.adjustedPrice.value;

    // The platform does not include prices for selected option values in a line item product's
    // price by default.  So, we must add the option price to get the correct line item total price.
    collections.forEach(lineItem.optionProductLineItems, function (item) {
        price = price.add(item.adjustedNetPrice);
    });

    return price;
}


module.exports = function (object, lineItem) {
    Object.defineProperty(object, 'unformattedPrice', {
        enumerable: true,
        writable: true,
        value: getTotalPrice(lineItem)
    });
};

