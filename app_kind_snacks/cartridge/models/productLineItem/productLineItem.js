/* global empty */
'use strict';

var ArrayList = require('dw/util/ArrayList');

var base = module.superModule;
var productDecorators = require('*/cartridge/models/product/decorators/index');
var subscriptionType = require('*/cartridge/models/productLineItem/decorators/subscriptionType');
var gtmCategory = require('*/cartridge/models/productLineItem/decorators/gtmCategory');
var unformattedPrice = require('*/cartridge/models/productLineItem/decorators/unformattedPrice');
var masterId = require('*/cartridge/models/productLineItem/decorators/masterId');
var packSize = require('*/cartridge/models/productLineItem/decorators/packSize');
var isCheckAddressFraud = require('*/cartridge/models/productLineItem/decorators/isCheckAddressFraud');
var isSnacksClubItem = require('*/cartridge/models/productLineItem/decorators/isSnacksClubItem');
var gmFlavor = require('*/cartridge/models/productLineItem/decorators/gmFlavor');
var badge = require('*/cartridge/models/productLineItem/decorators/badge');

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
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function productLineItem(product, apiProduct, options) {
    base(product, apiProduct, options);

    productDecorators.access(product, apiProduct);
    productDecorators.byob(product, apiProduct, options.lineItem);
    productDecorators.quantity(product, apiProduct, options.quantity);
    productDecorators.raw(product, apiProduct);
    productDecorators.responsiveImages(product, apiProduct);
    productDecorators.images(product, apiProduct, { types: ['large'], quantity: 'single', writable: false });
    subscriptionType(product, options.lineItem);
    gtmCategory(product, options.lineItem);
    unformattedPrice(product, options.lineItem);
    masterId(product, apiProduct);
    isCheckAddressFraud(product, apiProduct);
    isSnacksClubItem(product, apiProduct);
    packSize(product, apiProduct);
    badge(product, apiProduct);
    gmFlavor(product, apiProduct);

    var promotions = new ArrayList();
    /**
     * Rather than getting the price for all product promotions tied to the product, only use the applied promotions
     * This makes the sale price that is displayed more accurate.
     *
     * If there's no applied promotions, we're safe to apply an empty list
     */
    if (!empty(product.appliedPromotions)) {
        var len = product.appliedPromotions.length;
        for (var i = 0; i < len; i++) {
            var appliedPromo = product.appliedPromotions[i].raw;

            if (!empty(appliedPromo)) {
                promotions.push(appliedPromo);
            }
        }
    }

    productDecorators.price(product, apiProduct, promotions, false, options.currentOptionModel, false);

    return product;
};
