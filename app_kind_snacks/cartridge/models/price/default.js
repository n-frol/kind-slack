'use strict';

var formatMoney = require('dw/util/StringUtils').formatMoney;
var base = module.superModule;

/**
 * Convert API price to an object
 * @param {dw.value.Money} price - Price object returned from the API
 * @returns {Object} price formatted as a simple object
 */
function toPriceModel(price) {
    var value = price.available ? price.getDecimalValue().get() : null;
    var currency = price.available ? price.getCurrencyCode() : null;
    var formattedPrice = price.available ? formatMoney(price) : null;
    var decimalPrice;

    if (formattedPrice) { decimalPrice = price.getDecimalValue().toString(); }

    return {
        value: value,
        currency: currency,
        formatted: formattedPrice,
        decimalPrice: decimalPrice
    };
}

/**
 * @constructor
 * @classdesc Default price class
 * @param {dw.value.Money} salesPrice - Sales price
 * @param {dw.value.Money} listPrice - List price
 * @param {dw.value.Money} ogPrice - OrderGroove price
 */
function DefaultPrice(salesPrice, listPrice, ogPrice) {
    base.apply(this, [salesPrice, listPrice]);

    this.ogPrice = ogPrice ? toPriceModel(ogPrice) : null;
}

module.exports = DefaultPrice;
