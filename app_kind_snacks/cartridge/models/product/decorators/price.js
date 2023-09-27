/* global empty */
'use strict';

var priceFactory = require('*/cartridge/scripts/factories/price');

module.exports = function (object, product, promotions, useSimplePrice, currentOptions, writeable) {
    Object.defineProperty(object, 'price', {
        enumerable: true,
        value: priceFactory.getPrice(product, null, useSimplePrice, promotions, currentOptions),
        writable: !empty(writeable) ? writeable : true // Default to writeable so we have a way to override the promotions object created by base SFRA.  Then we can lock it in
    });
};
