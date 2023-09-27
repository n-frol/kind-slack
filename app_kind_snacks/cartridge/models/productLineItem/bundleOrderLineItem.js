'use strict';

var productDecorators = require('*/cartridge/models/product/decorators/index');

var base = module.superModule;
var gtmCategory = require('*/cartridge/models/productLineItem/decorators/gtmCategory');
var masterId = require('*/cartridge/models/productLineItem/decorators/masterId');

/**
 * Decorate product with product line item information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 * @property {dw.catalog.ProductVarationModel} options.variationModel - Variation model returned by the API
 * @property {Object} options.lineItemOptions - Options provided on the query string
 * @property {dw.catalog.ProductOptionModel} options.currentOptionModel - Options model returned by the API
 * @property {dw.util.Collection} options.promotions - Active promotions for a given product
 * @property {number} options.quantity - Current selected quantity
 * @property {Object} options.variables - Variables passed in on the query string
 * @param {Object} factory - Reference to product factory
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function bundleOrderLineItem(product, apiProduct, options, factory) {
    base(product, apiProduct, options, factory);

    productDecorators.images(product, apiProduct, { types: ['large'], quantity: 'single', writable: false });

    gtmCategory(product, options.lineItem);
    masterId(product, apiProduct);

    productDecorators.byob(product, apiProduct, options.lineItem);

    return product;
};
