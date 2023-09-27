/* global empty */

'use strict';

/**
 * taxes.js
 *
 * Back-end hooks script file for updating the tax calculations on the current
 * basket. This overrides the default taxes hook in app_storefront_base.
 *
 * @module hooks/taxes
 */

// SFCC system class imports.
var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');
var Money = require('dw/value/Money');

// Vertex class imports.
var VertexRequest = require('*/cartridge/models/vertexRequest');
var VertexResponse = require('int_vertex/cartridge/models/vertexResponse');
var VertexService = require('*/cartridge/scripts/services/vertexService');

/**
 * @typedef {Object} Response
 * @property {[TaxField]} taxes - List of taxes to line items UUIDs to be applied to the order
 * @property {Object} custom - List of custom properties to be attached to the basket
 * @property {boolean} success - Flag indicating the success of the tax calculation.
 */

/**
 * @typedef {Object} TaxField
 * @property {string} UUID - ID of the line item
 * @property {number|dw.value.Money} value - Either Tax Code or Tax Amount that should be applied to the line item.
 * @property {boolean="false"} amount - Boolean indicating whether value field contains Tax Amount (true) or Tax Rate (false).
 */

/**
 * Calculate sales taxes
 * @param {dw.order.Basket} basket - current basket
 * @returns {Response} - An object that contains calculated taxes and custom properties
 */
function calculateTaxes(basket) {
    var vLog = Logger.getLogger('vertex', 'vertex');
    var logPrefix = 'Vertex - taxes.js:\n\t';
    var vertexService = new VertexService();
    var vBasket = !empty(basket) ? basket : BasketMgr.getCurrentOrNewBasket();
    var vResult = { ok: false };
    var taxes = [];
    var vertexResponse;
    var isSuccess = false;
    var logMsg = '';
    var result;

    try {
        var vertexRequest = new VertexRequest(vBasket);
        if (vertexRequest.valid) {
            try {
                // Check for cached tax results.
                var storedHash = 'vertexTaxCalculationHash' in basket.custom &&
                    !empty(basket.custom.vertexTaxCalculationHash) ?
                    basket.custom.vertexTaxCalculationHash : '';
                var storedMap = 'vertexTaxCalculationMap' in basket.custom &&
                    !empty(basket.custom.vertexTaxCalculationMap) ?
                    JSON.parse(basket.custom.vertexTaxCalculationMap) : {};
                var requestHash = vertexRequest.getBasketHash();

                var hashMatch = Number(storedHash) === requestHash.hash;

                // If a valid tax result is cached and the basket hash matches the
                // current basket hash, then return the cached result.
                if (requestHash.valid &&
                    hashMatch &&
                    storedMap &&
                    'taxes' in storedMap &&
                    storedMap.taxes.length
                ) {
                    // Log a debug message for tracking when taxes are cached.
                    var msg = 'Tax not updated: matching hash found in the ' +
                        'session.custom.vertexRequest cache,';
                    vLog.info(logPrefix + msg);

                    // Create the tax results from the cached JSON object.
                    taxes = storedMap.taxes.map(function (tax) {
                        return {
                            uuid: tax.UUID,
                            value: new Money(tax.value, tax.currencyCode),
                            amount: tax.amount
                        };
                    });

                    // Log the return of cached results.
                    msg = logPrefix + 'Returning cached tax results:\n\t {0}';
                    vLog.info(msg, JSON.stringify(storedMap));

                    return {
                        taxes: taxes,
                        custom: {},
                        isSuccess: true
                    };
                }
            } catch (e) {
                taxes = [];
                vLog.error(logPrefix +
                    'ERROR comparing cached tax to current basket:', e);
            }

            // Call the tax calculation service if no stored results were found.
            vResult = vertexService.calculateTax(vertexRequest);
        }

        if (vResult.ok) {
            vertexResponse = new VertexResponse(vResult.object);
            var taxesResult = vertexResponse.getTaxes(vBasket);
            taxes = taxesResult.success ? taxesResult.taxes : [];
        }

        // If tax results were returned, set success flag, and store in session.
        if (taxes.length) {
            var hashTaxes = taxes.map(function (taxRecord) {
                return {
                    UUID: taxRecord.uuid,
                    value: taxRecord.value.valueOrNull,
                    currencyCode: taxRecord.value.currencyCode,
                    amount: taxRecord.amount
                };
            });
            basket.custom.vertexTaxCalculationHash = vertexRequest
                .getBasketHash().hash;
            basket.custom.vertexTaxCalculationMap = JSON.stringify({
                taxes: hashTaxes
            });

            // Log the success.
            logMsg = logPrefix + 'Vertex tax results returned successfuly: ';
            logMsg += '\n\t' + JSON.stringify(hashTaxes);
            vLog.info(logMsg);

            isSuccess = true;
        }
    } catch (e) {
        // Log the failure.
        var errMsg = logPrefix +
            'ERROR in: int_vertex/cartridge/scripts/hooks/taxes.js';
        errMsg += '\n\tat: calculateTaxes()';
        Object.keys(e).forEach(function (key) {
            errMsg += '\n\t' + key + ': ' + e[key];
        });

        isSuccess = false;
        vLog.error(errMsg);
    }

    // Log the result;
    result = { taxes: taxes, custom: {}, success: isSuccess };
    logMsg = logPrefix + 'Returning tax result:\n\t' +
        'success: {0}\n\t' +
        'taxes: {1}\n\t';

    var taxesString = '';
    if (taxes.length) {
        taxesString = taxes.map(function (taxRec) {
            var taxStr = '\n';
            taxStr += '\n\tLine Item UUID: ';
            taxStr += !empty(taxRec.uuid) ? taxRec.uuid : '';
            taxStr += '\n\tAmount or Rate: ';
            taxStr += !empty(taxRec.amount) && taxRec.amount ? 'amount' : 'rate';
            taxStr += '\n\tValue: ';
            taxStr += taxRec.value.valueOrNull;
            return taxStr;
        }).join();
    }

    vLog.info(logMsg, isSuccess, taxesString);

    return result;
}

module.exports = {
    calculateTaxes: calculateTaxes
};
