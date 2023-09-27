/* global empty, session */

'use strict';

/**
 * vertexResponse.js
 *
 * Exports a single module for modeling of the response from a call to the
 * Vertex SOAP web service.
 * @module VertexResponse
 */

// SFCC system class imports.
var Logger = require('dw/system/Logger');
var Money = require('dw/value/Money');
var ShippingMgr = require('dw/order/ShippingMgr');
var Transaction = require('dw/system/Transaction');

// Module level declarations.
var vLog = Logger.getLogger('vertex', 'vertex');

/**
 * A model class that provides null checking and a standard interface for
 * applying tax results to throughout the storefront.
 *
 * @class
 * @constructor
 * @param {Object} rawResponse - The returned response object from the SFCC
 *      service call to the Vertex tax calculation service. This response will
 *      be an instance of the VertexEnvelope generated class.
 */
function VertexResponse(rawResponse) {
    var raw = rawResponse;
    this.valid = true;
    this.lineItems = {};
    var instance = this;

     // If there is not a response then there was a fault.
    if (empty(raw.getAccrualRequestOrAccrualResponseOrAccrualSyncRequest)) {
        this.valid = false;
    } else {
        var quotationResponse = raw.getAccrualRequestOrAccrualResponseOrAccrualSyncRequest();

        // Parse the response to get the tax results for our line items.
        try {
            var vLineItems = !(quotationResponse.lineItem.empty) ?
            quotationResponse.getLineItem() : [];

            // Loop through the returned Vertex line items and update the taxes
            // on the corresponding basket line item.
            vLineItems.toArray().forEach(function (vli) {
                var lineItemId = vli.getLineItemId();
                var vTax = vli.getTotalTax();

                // Create an entry using the lineItemId as the key for updating.
                instance.lineItems[lineItemId] = new Money(vTax,
                    session.getCurrency());
            });
        } catch (e) {
            this.valid = false;
            var errMsg = 'ERROR in vertexResponse.js at constructor:';
            Object.keys(e).forEach(function (key) {
                errMsg += '\n' + key + ': ' + e[key];
            });

            vLog.error(errMsg);
        }
    }
}

/**
 * Gets the taxes in the format needed for the return value of the SFRA taxes
 * hook point.
 *
 * @param {dw.order.Basket} basket - The customer's basket that will have
 *      the matching line items updated with tax calculations returned from the
 *      API call.
 * @returns {{success: bool, msg: ?string, result: Array<Object>}} - Returns
 *      an object literal that has a success flag, a string for any returned
 *      messaging, and an Array of Objects containing the taxation results from
 *      the Vertex API lookup.
 */
VertexResponse.prototype.getTaxes = function (basket) {
    var instance = this;
    var taxes = [];

    // If the response is not valid or the basket is empty;
    if (!this.valid || empty(basket) || basket.allLineItems.empty) {
        return {
            success: false,
            taxes: []
        };
    }

    // Error handling for creating tax mappings.
    try {
        var basketLineItemsCollection = basket.getAllLineItems();
        var basketLineItems = !basketLineItemsCollection.empty ?
            basketLineItemsCollection.toArray() : [];

        basketLineItems.forEach(function (li) {
            var liTaxes = {};
            var uid = li.getUUID();
            var taxable = li instanceof dw.order.ProductLineItem || li instanceof dw.order.ShippingLineItem; //eslint-disable-line
            if (taxable && (basket.adjustedMerchandizeTotalNetPrice.value <= 0 || li.adjustedNetPrice.value <= 0)) {
                taxable = false;
            }

            // If the tax results for the item are found in the response,
            // push a taxation result object to the results array.
            if (!empty(uid) && !empty(instance.lineItems[uid])) {
                liTaxes.value = instance.lineItems[uid];
                liTaxes.amount = true;
                liTaxes.uuid = uid;

                if (!taxable) {
                    liTaxes.value = new Money(0, li.basePrice.currencyCode);
                }
                taxes.push(liTaxes);

                // Debug logging.
                var dbgMsg;
                if (taxable) {
                    dbgMsg = '- Line Item: {0} \n- Updated with Tax Amount: {1}';
                    vLog.info(dbgMsg, li.lineItemText, liTaxes.value);
                } else {
                    dbgMsg = '- Line Item: {0} \n- Not taxable';
                    vLog.info(dbgMsg, li.lineItemText);
                }
            }
        });
    } catch (e) {
        this.valid = false;
        var errMsg = 'ERROR in vertexResponse.js at getTaxes():';
        Object.keys(e).forEach(function (key) {
            errMsg += '\n' + key + ': ' + e[key];
        });

        vLog.error(errMsg);
        return {
            success: false,
            taxes: []
        };
    }

    return {
        success: true,
        taxes: taxes
    };
};

/**
 * Updates the current Basket's line items with the reutrned tax results. Each
 * LineItem will have the taxes updated with the returned taxes from the Vertex
 * tax calculation response.
 *
 * @requires dw.system.Transactional
 * @param {dw.order.Basket} basket - The customer's basket that will have
 *      the matching line items updated with tax calculations returned from the
 *      API call.
 * @returns {bool} - Returns the boolean value indicating the success of the
 *      basket update.
 * @memberof VertexResponse
 */
VertexResponse.prototype.updateBasket = function (basket) {
    var instance = this;
    var basketUpdated = false;

    try {
        var basketLineItemsCollection = basket.getAllLineItems();
        var basketLineItems = !basketLineItemsCollection.empty ?
            basketLineItemsCollection.toArray() : [];

        // Check if there is a matching line items in the basket and update the
        // item if found.
        if (basketLineItems.length) {
            basketLineItems.forEach(function (li) {
                if (typeof instance.lineItems[li.getUUID()] !== 'undefined') {
                    var liAmt = instance.lineItems[li.getUUID()];
                    vLog.info('Tax being set for Line Item {0} for Tax Amount {1}', li.getLineItemText(), liAmt.value);
                    Transaction.wrap(function () {
                        li.setTax(liAmt);
                    });

                    // Set the flag to indicate that a basket item was updated.
                    basketUpdated = true;
                }
            });
        }

        // If the basket was updated, then update the basket totals.
        if (basketUpdated) {
            Transaction.wrap(function () {
                // Re-apply the shipping costs in case they were updated.
                ShippingMgr.applyShippingCost(basket);

                // Update the basket totals.
                basket.updateTotals();
            });
        }
    } catch (e) {
        var errMsg = 'ERROR in vertexResponse at updateBasket():';
        Object.keys(e).forEach(function (key) {
            errMsg += '\n' + key + ': ' + e[key];
        });
        vLog.error(errMsg);
    }

    return true;
};

module.exports = VertexResponse;
