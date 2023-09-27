/* global empty */

'use strict';

/**
 * @module calculate.js
 *
 * This javascript file implements methods that override default functionality
 * of the app_storefront_base calculate JS script.
 */

// SFCC system class imports.
var TaxMgr = require('dw/order/TaxMgr');
var Status = require('dw/system/Status');
var ShippingLineItem = require('dw/order/ShippingLineItem');

// SFRA module imports.
var collections = require('*/cartridge/scripts/util/collections');

/**
 * This function overrides the default implementation in order to update the
 * basket taxes utilizing the tax amount rather than the tax rate.
 *
 * @param {dw.order.Basket} basket - The basket containing the elements for which
 *      taxes need to be calculated
 * @returns {dw.system.Status} - Returns a Status instance to indicate the
 *      success or failure of the tax calculations.
 */
exports.calculateTax = function (basket) {
    var basketCalculationHelpers = require(
        '*/cartridge/scripts/helpers/basketCalculationHelpers');
    var lineItems = basket.getAllLineItems();
    var totalShippingGrossPrice = 0;
    var totalShippingNetPrice = 0;
    var taxes = basketCalculationHelpers.calculateTaxes(basket);
    var basketPAs = !empty(basket.getPriceAdjustments()) ?
        basket.getPriceAdjustments().toArray() : [];
    var basketShippingPAs = !empty(basket.getShippingPriceAdjustments()) ?
        basket.getShippingPriceAdjustments().toArray() : [];
    var taxesMap = {};

    // update taxes for all line items
    if (lineItems.length && taxes.taxes.length) {
        // convert taxes into map for performance.
        taxes.taxes.forEach(function (item) {
            taxesMap[item.uuid] = { value: item.value, amount: item.amount };
        });

        // Loop through the LineItems in the cart and apply taxes.
        collections.forEach(lineItems, function (lineItem) {
            var tax = taxesMap[lineItem.UUID];

            if (tax) {
                if (tax.amount) {
                    // Typo fixed from app_storefront_base version.
                    lineItem.updateTaxAmount(tax.value);
                    if (lineItem instanceof ShippingLineItem) {
                        totalShippingGrossPrice += lineItem.getAdjustedGrossPrice();
                        totalShippingNetPrice += lineItem.getAdjustedNetPrice();
                    }
                } else {
                    lineItem.updateTax(tax.value);
                }
            } else if (lineItem.taxClassID === TaxMgr.customRateTaxClassID) {
                // do not touch tax rate for fix rate items
                lineItem.updateTax(lineItem.taxRate);
            } else {
                // otherwise reset taxes to null
                lineItem.updateTax(null);
            }
        });
    } else {
        return new Status(Status.ERROR, 'ERROR', 'Unable to calculate taxes' +
            ' for an empty basket.');
    }

    // Handle order level adjustments.
    if (basketPAs.length || basketShippingPAs.length) {
        var grossTotal = (basket.getMerchandizeTotalGrossPrice().value +
            basket.getShippingTotalGrossPrice().value);
        var netTotal = (basket.getMerchandizeTotalNetPrice().value +
            basket.getShippingTotalNetPrice());
        var basketPARate = (grossTotal / netTotal) - 1;
        var basketShippingPARate = (totalShippingGrossPrice /
            totalShippingNetPrice) - 1;

        basketPAs.forEach(function (basketPriceAdjustment) {
            basketPriceAdjustment.updateTax(basketPARate);
        });

        basketShippingPAs.forEach(function (basketShippingPriceAdjustment) {
            basketShippingPriceAdjustment.updateTax(basketShippingPARate);
        });
    }

    // If hook returned custom properties attach them to the order model.
    if (taxes.custom) {
        Object.keys(taxes.custom).forEach(function (key) {
            basket.custom[key] = taxes.custom[key];
        });
    }

    return new Status(Status.OK);
};
