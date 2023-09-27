'use strict';

var proratedPrice = require('*/cartridge/models/productLineItem/decorators/proratedPrice');
var productId = require('*/cartridge/models/productLineItem/decorators/productId');
var category = require('*/cartridge/models/productLineItem/decorators/category');

var base = module.superModule || require('app_kind_snacks/cartridge/models/productLineItem/productLineItem');

function productLineItem(product, apiProduct, options) {
    base.call(this, product, apiProduct, options);
    proratedPrice(product, options.lineItem);
    productId(product, options.lineItem);
    category(product, options.lineItem);
    return product;
}

module.exports = productLineItem;

