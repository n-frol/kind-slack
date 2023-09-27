'use strict';

var ImageModel = require('*/cartridge/models/product/productImages');

module.exports = function (object, product, config) {
    Object.defineProperty(object, 'images', {
        enumerable: true,
        value: new ImageModel(product, config),
        writable: config.writeable || true // Default to writeable so we have a way to override the image object created by base SFRA.  Then we can lock it in
    });
};
