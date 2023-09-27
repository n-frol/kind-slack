'use strict';

const base = module.superModule || require('app_storefront_base/cartridge/models/productLineItem/bundleLineItem');
const gtmItemVariant = require('*/cartridge/models/productLineItem/decorators/gtmItemVariant');
const gtmItemListName = require('*/cartridge/models/productLineItem/decorators/gtmItemListName');

function bundleLineItem(product, apiProduct, options, factory) {
    base.call(this, product, apiProduct, options, factory);
    gtmItemVariant(product, options.lineItem);
    gtmItemListName(product, options.lineItem);
    return product;
}

module.exports = bundleLineItem;
