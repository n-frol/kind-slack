/* eslint-disable */
'use strict';

/**
 * @module calculateRecurring.js
 *
 * This module calculates the curring orders discount, tax and shipping prices.
 * It's subsided of the calculate.js file. Base on recurring process, calculation
 * has to separated from common uses because product price driven by the
 * order groove.
 *
 * Only differences on this file is product price calculation is not exist since
 * the order groove defines to price.
 *
 */
var HashMap = require('dw/util/HashMap');
var PromotionMgr = require('dw/campaign/PromotionMgr');
var ShippingMgr = require('dw/order/ShippingMgr');
var ShippingLocation = require('dw/order/ShippingLocation');
var TaxMgr = require('dw/order/TaxMgr');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var HookMgr = require('dw/system/HookMgr');
var collections = require('*/cartridge/scripts/util/collections');
var ogLog = Logger.getLogger('order-groove', 'OG');

/**
 * @function calculate
 *
 * calculate is the arching logic for computing the value of a basket.  It makes
 * calls into cart/calculate.js and enables both SG and OCAPI applications to share
 * the same cart calculation logic.
 *
 * @param {object} basket The basket to be calculated
 */
exports.calculateRecurring = function (basket) {

    // ===================================================
    // =====    CALCULATE GIFT CERTIFICATE PRICES    =====
    // ===================================================

    calculateGiftCertificatePrices(basket);

    // ===================================================
    // =====      APPLY ORDERGROOVE INCENTIVES       =====
    // ===================================================
    if(HookMgr.hasHook('ordergroove.order.incentives')) {
        ogLog.info('OrderGroove Hook called:\n\t' +
            'Hook: ordergroove.order.incentives\n\t' +
            'Method: setOrderGroovePromos'
        );
        HookMgr.callHook('ordergroove.order.incentives', 'setOrderGroovePromos', basket, request.getHttpCookies());
    }

    // ===================================================
    // =====   Note: Promotions must be applied      =====
    // =====   after the tax calculation for         =====
    // =====   storefronts based on GROSS prices     =====
    // ===================================================

    // ===================================================
    // =====   APPLY PROMOTION DISCOUNTS			 =====
    // =====   Apply product and order promotions.   =====
    // =====   Must be done before shipping 		 =====
    // =====   calculation. 					     =====
    // ===================================================

    PromotionMgr.applyDiscounts(basket);

    // ===================================================
    // =====        CALCULATE SHIPPING COSTS         =====
    // ===================================================

    // apply product specific shipping costs
    // and calculate total shipping costs
    HookMgr.callHook('dw.order.calculateShipping', 'calculateShipping', basket);

    // ===================================================
    // =====   APPLY PROMOTION DISCOUNTS			 =====
    // =====   Apply product and order and 			 =====
    // =====   shipping promotions.                  =====
    // ===================================================

    PromotionMgr.applyDiscounts(basket);


    // ===================================================
    // =====     APPLY ORDERGROOVE EXCLUSIVITY       =====
    // ===================================================
    if(HookMgr.hasHook('ordergroove.order.incentives')) {
        ogLog.info('OrderGroove Hook called:\n\t' +
            'Hook: ordergroove.order.incentives\n\t' +
            'Method: setOrderGrooveExclusivity'
        );
        HookMgr.callHook('ordergroove.order.incentives', 'setOrderGrooveExclusivity', basket, request.getHttpCookies());
    }

    // ===================================================
    // =====         CALCULATE TAX                   =====
    // ===================================================

    HookMgr.callHook('dw.order.calculateTax', 'calculateTax', basket);

    // ===================================================
    // =====         CALCULATE BASKET TOTALS         =====
    // ===================================================

    basket.updateTotals();

    // ===================================================
    // =====            DONE                         =====
    // ===================================================

    return new Status(Status.OK);
};

/**
 * @function calculateGiftCertificates
 *
 * Function sets either the net or gross price attribute of all gift certificate
 * line items of the basket by using the gift certificate base price. It updates the basket in place.
 *
 * @param {object} basket The basket containing the gift certificates
 */
function calculateGiftCertificatePrices (basket) {
    var giftCertificates = basket.getGiftCertificateLineItems().iterator();
    while (giftCertificates.hasNext()) {
        var giftCertificate = giftCertificates.next();
        giftCertificate.setPriceValue(giftCertificate.basePrice.valueOrNull);
    }
}

exports.calculateShipping = function(basket) {
    ShippingMgr.applyShippingCost(basket);
    return new Status(Status.OK);
}

/**
 * @function calculateTax <p>
 *
 * Determines tax rates for all line items of the basket. Uses the shipping addresses
 * associated with the basket shipments to determine the appropriate tax jurisdiction.
 * Uses the tax class assigned to products and shipping methods to lookup tax rates. <p>
 *
 * Sets the tax-related fields of the line items. <p>
 *
 * Handles gift certificates, which aren't taxable. <p>
 *
 * Note that the function implements a fallback to the default tax jurisdiction
 * if no other jurisdiction matches the specified shipping location/shipping address.<p>
 *
 * Note that the function implements a fallback to the default tax class if a
 * product or a shipping method does explicitly define a tax class.
 *
 * @param {dw.order.Basket} basket The basket containing the elements for which taxes need to be calculated
 */
exports.calculateTax = function(basket) {
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    var taxes = basketCalculationHelpers.calculateTaxes(basket);

    // convert taxes into hashmap for performance.
    var taxesMap = {};

    taxes.taxes.forEach(function (item) {
        taxesMap[item.uuid] = { value: item.value, amount: item.amount };
    });

    var lineItems = basket.getAllLineItems();

    var totalShippingGrossPrice = 0;
    var totalShippingNetPrice = 0;

    var containsGlobalPriceAdjustments = false;

    // update taxes for all line items
    collections.forEach(lineItems, function (lineItem) {
        var tax = taxesMap[lineItem.UUID];

        if (tax) {
            if (tax.amount) {
                lineItem.updateTaxAmoun(tax.value);
                if (lineItem instanceof dw.order.ShippingLineItem) {
                    totalShippingGrossPrice += lineItem.getAdjustedGrossPrice();
                    totalShippingNetPrice += lineItem.getAdjustedNetPrice();
                }
            } else {
                lineItem.updateTax(tax.value);
            }
        } else {
            if (lineItem.taxClassID === TaxMgr.customRateTaxClassID) {
                // do not touch tax rate for fix rate items
                lineItem.updateTax(lineItem.taxRate);
            } else {
                // otherwise reset taxes to null
                lineItem.updateTax(null);
            }
        }
    });

    // besides shipment line items, we need to calculate tax for possible order-level price adjustments
    // this includes order-level shipping price adjustments
    if (!basket.getPriceAdjustments().empty || !basket.getShippingPriceAdjustments().empty) {
        if (collections.first(basket.getPriceAdjustments(), function (priceAdjustment) {
            return taxesMap[priceAdjusmtnet.UUID] === null;
        }) || collections.first(basket.getShippingPriceAdjustments(), function (shippingPriceAdjustment) {
            return taxesMap[shippingPriceAdjustment.UUID] === null;
        })) {
            // tax hook didn't provide taxes for global price adjustment, we need to calculate them ourselves.
            // calculate a mix tax rate from
            var basketPriceAdjustmentsTaxRate = ((basket.getMerchandizeTotalGrossPrice().value + basket.getShippingTotalGrossPrice().value)
                / (basket.getMerchandizeTotalNetPrice().value + basket.getShippingTotalNetPrice())) - 1;

            var basketPriceAdjustments = basket.getPriceAdjustments();
            collections.forEach(basketPriceAdjustments, function (basketPriceAdjustment) {
                basketPriceAdjustment.updateTax(basketPriceAdjustmentsTaxRate);
            });

            var basketShippingPriceAdjustments = basket.getShippingPriceAdjustments();
            collections.forEach(basketShippingPriceAdjustments, function(basketShippingPriceAdjustment) {
                basketShippingPriceAdjustment.updateTax(totalShippingGrossPrice/totalShippingNetPrice - 1);
            });
        }
    }

    // if hook returned custom properties attach them to the order model
    if (taxes.custom) {
        Object.keys(taxes.custom).forEach(function (key) {
            basket.custom[key] = taxes.custom[key];
        });
    }

    return new Status(Status.OK);
}
