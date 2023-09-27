'use strict';

var proratedPrice = require('*/cartridge/models/productLineItem/decorators/proratedPrice');
var productId = require('*/cartridge/models/productLineItem/decorators/productId');
var category = require('*/cartridge/models/productLineItem/decorators/category');

var base = module.superModule || require('app_storefront_base/cartridge/models/productLineItem/bundleLineItem');

function bundleLineItem(product, apiProduct, options, factory) {
    base.call(this, product, apiProduct, options, factory);
    proratedPrice(product, options.lineItem);
    productId(product, options.lineItem);
    category(product, options.lineItem);
    return product;
}

module.exports = bundleLineItem;

