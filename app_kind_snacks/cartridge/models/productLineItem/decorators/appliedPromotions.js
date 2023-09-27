'use strict';

var collections = require('*/cartridge/scripts/util/collections');

/**
 * get the promotions applied to the product line item
 * @param {dw.order.ProductLineItem} lineItem - API ProductLineItem instance
 * @returns {Object[]|undefined} an array of objects containing the promotions applied to the
 *                               product line item.
 */
function getAppliedPromotions(lineItem) {
    var priceAdjustments;
    var priceAdjustmentsFiltered; // Filtered list of adjustments with empty promos taken out

    if (lineItem.priceAdjustments.getLength() > 0) {
        priceAdjustmentsFiltered = collections.filter(lineItem.priceAdjustments, function (priceAdjustment) {
            return !!priceAdjustment.promotion;
        });

        priceAdjustments = priceAdjustmentsFiltered.map(function (priceAdjustment) {
            return {
                callOutMsg: priceAdjustment.promotion.calloutMsg ?
                    priceAdjustment.promotion.calloutMsg.markup : '',
                name: priceAdjustment.promotion.name,
                details: priceAdjustment.promotion.details ?
                    priceAdjustment.promotion.details.markup : '',
                raw: priceAdjustment.promotion
            };
        });
    }

    return priceAdjustments;
}

module.exports = function (object, lineItem) {
    Object.defineProperty(object, 'appliedPromotions', {
        enumerable: true,
        writable: true,
        value: getAppliedPromotions(lineItem)
    });
};
