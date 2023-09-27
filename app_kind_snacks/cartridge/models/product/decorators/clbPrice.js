'use strict';

var priceFactory = require('*/cartridge/scripts/factories/clbPrice');
var priceHelper = require('*/cartridge/scripts/helpers/clbPricing');

/**
 * Renders clb pricing template for line item
 * @param {Object} price - Factory price
 * @return {string} - Rendered HTML
 */
function getRenderedPrice(price) {
    var context = {
        clbPrice: price
    };
    return priceHelper.renderHtml(priceHelper.getHtmlContext(context));
}
module.exports = function (object, product, promotions, useSimplePrice, currentOptions) {
    Object.defineProperty(object, 'clbPrice', {
        enumerable: true,
        writable: true,
        value: priceFactory.getPrice(product, null, useSimplePrice, promotions, currentOptions)
    });
    Object.defineProperty(object, 'renderedClbPrice', {
        enumerable: true,
        writable: true,
        value: getRenderedPrice(object.clbPrice)
    });
};
