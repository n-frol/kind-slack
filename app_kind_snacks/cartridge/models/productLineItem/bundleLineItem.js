'use strict';

var productDecorators = require('*/cartridge/models/product/decorators/index');

var base = module.superModule;
var gtmCategory = require('*/cartridge/models/productLineItem/decorators/gtmCategory');
var masterId = require('*/cartridge/models/productLineItem/decorators/masterId');
var packSize = require('*/cartridge/models/productLineItem/decorators/packSize');
var isCheckAddressFraud = require('*/cartridge/models/productLineItem/decorators/isCheckAddressFraud');
var isSnacksClubItem = require('*/cartridge/models/productLineItem/decorators/isSnacksClubItem');
var productLineItemDecorators = require('*/cartridge/models/productLineItem/decorators/index');
var badge = require('*/cartridge/models/productLineItem/decorators/badge');
var gmFlavour = require('*/cartridge/models/productLineItem/decorators/gmFlavor');

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
module.exports = function bundleLineItem(product, apiProduct, options, factory) {
    base(product, apiProduct, options, factory);

    productDecorators.byob(product, apiProduct, options.lineItem);
    productDecorators.isHiddenComponents(product, apiProduct);
    productDecorators.images(product, apiProduct, { types: ['large'], quantity: 'single', writable: false });
    productDecorators.quantity(product, apiProduct, options.quantity);
    productLineItemDecorators.bonusProductLineItemUUID(product, options.lineItem);
    productLineItemDecorators.preOrderUUID(product, options.lineItem);
    productLineItemDecorators.discountBonusLineItems(product, options.lineItem.UUID);
    gtmCategory(product, options.lineItem);
    isCheckAddressFraud(product, apiProduct);
    masterId(product, apiProduct);
    isSnacksClubItem(product, apiProduct);
    packSize(product, apiProduct);
    badge(product, apiProduct);
    gmFlavour(product, apiProduct);

    return product;
};
