'use strict';

var base = module.superModule;
var productDecorators = require('*/cartridge/models/product/decorators/index');
var productLineItemDecorators = require('*/cartridge/models/productLineItem/decorators/index');
var subscriptionType = require('*/cartridge/models/productLineItem/decorators/subscriptionType');
var gtmCategory = require('*/cartridge/models/productLineItem/decorators/gtmCategory');
var unformattedPrice = require('*/cartridge/models/productLineItem/decorators/unformattedPrice');
var masterId = require('*/cartridge/models/productLineItem/decorators/masterId');

/**
 * Decorate product with product line item information from within an order
 * @param {Object} prod - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 * @property {dw.catalog.ProductVarationModel} options.variationModel - Variation model returned by the API
 * @property {Object} options.lineItemOptions - Options provided on the query string
 * @property {dw.catalog.ProductOptionModel} options.currentOptionModel - Options model returned by the API
 * @property {dw.util.Collection} options.promotions - Active promotions for a given product
 * @property {number} options.quantity - Current selected quantity
 * @property {Object} options.variables - Variables passed in on the query string
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function orderLineItem(prod, apiProduct, options) {
    var product = base(prod, apiProduct, options);

    productDecorators.byob(prod, apiProduct, options.lineItem);
    productDecorators.price(product, apiProduct, options.promotions, false, options.currentOptionModel);
    productDecorators.quantity(product, apiProduct, options.quantity);
    productDecorators.raw(product, apiProduct);
    productLineItemDecorators.quantityOptions(product, options.lineItem, options.quantity);
    productDecorators.images(product, apiProduct, { types: ['large'], quantity: 'single', writable: false });
    subscriptionType(product, options.lineItem);
    gtmCategory(product, options.lineItem);
    unformattedPrice(product, options.lineItem);
    masterId(product, apiProduct);
    return product;
};
