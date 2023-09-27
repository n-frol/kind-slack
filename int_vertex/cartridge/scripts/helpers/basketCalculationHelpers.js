/* global empty */
'use strict';

/**
 * basketCalculationHelpers.js
 * @extends app_storefront_base/cartridge/scripts/helpers/basketCalculationHelpers.js
 *
 * Provides hook access to the basket calculation hooks when utilizing the
 * int_vertex integration cartridge.
 */

// SFCC system class imports.
var HookMgr = require('dw/system/HookMgr');
var Logger = require('dw/system/Logger');
var Money = require('dw/value/Money');
var Site = require('dw/system/Site');

// Import the base version.
var base = require('app_storefront_base/cartridge/scripts/helpers/basketCalculationHelpers');

/**
 * Calculate sales taxes
 * @param {dw.order.Basket} basket - current basket
 * @returns {Object} - object describing taxes that needs to be applied
 */
function calculateTaxes(basket) {
    var vLog = Logger.getLogger('vertex', 'vertex');
    var logPrefix = 'Vertex - basketCalculationHelpers.js\n\t';
    var logMsg = '';
    var readyForTax = true;
    var result = { taxes: [] };
    var basketLineItems = basket.allLineItems;
    var site = Site.getCurrent();
    var shipments = !empty(basket) && !basket.shipments.empty ? basket.shipments.toArray() : [];
    var siteEmptyAddressPref = site.getCustomPreferenceValue('vertexNoAddressFallbackCalculate');
    var sfccCalculateWhenNoAddress = !empty(siteEmptyAddressPref) ? siteEmptyAddressPref : false;
    var isVertexEnabled = !empty(site.getCustomPreferenceValue('vertexIsEnabled')) &&
        HookMgr.hasHook('vertex.basket.taxes') ?
        site.getCustomPreferenceValue('vertexIsEnabled') : false;

    // Check if we have the necessary information to make Vertex call.
    if (shipments.length && !basketLineItems.empty) {
        shipments.forEach(function (shipment) {
            var shipmentAddress = shipment.shippingAddress;
            var shipmentItems = shipment.allLineItems;
            var shipmentHasLocation = !empty(shipmentAddress) && !empty(shipmentAddress.stateCode);

            // Do not worry about shipments with no line items.
            if (!shipmentItems.empty && !shipmentHasLocation) {
                readyForTax = false;
            }
        });
    } else {
        return { taxes: [], success: true, custom: {} };
    }

    /* ======================================================================
     * Call Vertex Tax Service
     * ====================================================================== */
    if (readyForTax && isVertexEnabled) {
        vLog.info(logPrefix + 'Calling tax hook: vertex.basket.taxes');
        result = HookMgr.callHook('vertex.basket.taxes', 'calculateTaxes', basket);

        // Return valid service call results.
        if (!empty(result.taxes)) {
            return result;
        }
        // Log the failed call & use of fallback.
        logMsg = logPrefix + 'Vertex tax hook did not return valid results: {0}';
        vLog.error(logMsg, JSON.stringify(result));
    }

    /* ======================================================================
     * Set Taxes to 0
     * ====================================================================== */
    if (!basketLineItems.empty && !readyForTax && !sfccCalculateWhenNoAddress) {
        // Create a $0 tax record for each item to 0 out the taxes.
        var zeroValTaxes = basketLineItems.toArray().map(function (bli) {
            return { uuid: bli.UUID, value: new Money(0.0, basket.currencyCode), amount: true };
        });

        logMsg = logPrefix + '\n\tVertex Tax hook not called because no address is set.';
        logMsg += '\n\tTaxes set to zero for all basket items.';
        vLog.info(logMsg);

        return { taxes: zeroValTaxes, success: true, custom: {} };
    }

    /* ======================================================================
     * Use Default SFCC Tax Lookup
     * ====================================================================== */
    logMsg = logPrefix + 'Using fallback tax calculation: app.basket.taxes:';
    vLog.info(logMsg);

    // Perform SFCC tax table lookup calculation service as a fallback.
    return HookMgr.callHook('app.basket.taxes', 'calculateTaxes', basket);
}

module.exports = base;
module.exports.calculateTaxes = calculateTaxes;
