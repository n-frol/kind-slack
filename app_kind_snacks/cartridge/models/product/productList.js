/* global empty */
'use strict';

/**
 * productList.js
 *
 * Exports a model wrapper class for passing ProductList data to and from the
 * view in a standardized format.
 */

// SFCC API imports
var Site = require('dw/system/Site');

// Model & Script imports
var BYOBHelpers = require('*/cartridge/scripts/helpers/byobHelpers');
var ProductFactory = require('*/cartridge/scripts/factories/product');

// Module level declarations
var site = Site.getCurrent();

/* ========================================================================
 * Private Helper Functions
 * ======================================================================== */

/**
 * Gets a the number of items to go in the box that the customer has selected.
 *
 * @param {dw.customer.ProductList} productList - The product list instance.
 * @return {number} - Returns the number of items needed to fill up the BYOB.
 */
function getBoxSize(productList) {
    var boxSize = 0;

    if (!empty(productList.custom.boxSize)) {
        // If the custom attr is set on the ProductList then use the parsed val.
        boxSize = !isNaN(parseInt(productList.custom.boxSize, 10)) ?
            parseInt(productList.custom.boxSize, 10) : 0;
    } else {
        // If the custom attr is not set, use the site pref for a default.
        var defaultBoxSize = site.getCustomPreferenceValue('byobDefaultBoxSize');
        if (!empty(defaultBoxSize)) {
            boxSize = !isNaN(parseInt(defaultBoxSize, 10)) ?
                parseInt(defaultBoxSize, 10) : 0;
        }
    }
    return boxSize.toFixed();
}

/**
 * Gets data for the product list specific to OrderGroove
 *
 * @param {dw.customer.ProductList} productList - The product list instance.
 * @return {Object} - Returns a JSON with OrderGroove related data
 */
function getOrderGrooveData(productList) {
    var data = {
        every: productList.custom.ogEvery || 0,
        everyPeriod: productList.custom.ogEveryPeriod || 0
    };

    return data;
}

/* ========================================================================
 * Public Exported Functions
 * ======================================================================== */

/**
 * @class ProductListModel
 * @classdesc - A model class for passing ProductList data to the view.
 * @param {dw.customer.ProductList} productList - The ProductList SFCC API
 *      object that is being modeled.
 */
function ProductListModel(productList) {
    this.ID = productList.ID;
    this.length = BYOBHelpers.getBYOBListItemCount(productList).toFixed();
    this.type = productList.type;
    this.boxSize = getBoxSize(productList);
    this.boxSku = !empty(productList.custom.boxSku) ?
        productList.custom.boxSku : '';
    this.activeStarterCombo = productList.custom.activeStarterCombo || '';

    var totalInBox = 0;

    // Get the individual line item models.
    var items = this.length ? productList.items.toArray().map(function (item) {
        totalInBox += item.quantityValue;

        return ProductFactory.get({
            pid: item.productID,
            quantity: item.quantityValue
        });
    }) : [];

    this.items = items;
    this.totalInBox = totalInBox;

    this.ogData = getOrderGrooveData(productList);
}

module.exports = ProductListModel;
