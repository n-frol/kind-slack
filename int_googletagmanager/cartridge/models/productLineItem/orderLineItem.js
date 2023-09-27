'use strict';

var proratedPrice = require('*/cartridge/models/productLineItem/decorators/proratedPrice');

var base = module.superModule || require('app_storefront_base/cartridge/models/productLineItem/orderLineItem');

function orderLineItem(product, apiProduct, options) {
    base.call(this, product, apiProduct, options);
    proratedPrice(product, options.lineItem);
    return product;
}

module.exports = orderLineItem;


