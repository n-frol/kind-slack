'use strict';

/**
 * productListItem.js
 *
 * Exports a single function that is a constructor for a model of the SFCC APIs
 * system object ProductListItem.
 */

// SFCC API imports
var productDecorators = require('*/cartridge/models/product/decorators/index');
var productLineItemDecorators = require('*/cartridge/models/productLineItem/decorators/index');

/**
 * @class ProductListItemModel
 * @classdesc - Models the SFCC API system object ProductListItem.
 * @param {Object} product - The object instance to decorate.
 * @param {dw.catalog.Product} apiProduct - The SFCC Product instance.
 * @param {Object} options - An options object.
 * @param {string} options.productType - The type of product to be modled.
 * @param {number} options.quantity - The quantity value of the line item.
 */
function ProductListItemModel(product, apiProduct, options) {
    // Product Decorators
    productDecorators.base(product, apiProduct, options.productType);
    productDecorators.images(product, apiProduct, {
        types: ['large'],
        quantity: 'single',
        writable: false
    });
    productDecorators.access(product, apiProduct);
    productDecorators.byob(product, apiProduct);
    productDecorators.raw(product, apiProduct);

    // ProductLineItem Decorators
    productLineItemDecorators.uuid(product, options.lineItem);
    productLineItemDecorators.quantity(product, options.quantity);
}

module.exports = ProductListItemModel;
