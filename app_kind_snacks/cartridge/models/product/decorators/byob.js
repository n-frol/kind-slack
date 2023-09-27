/* global empty */
'use strict';

function getByobVariant(apiProduct) {
    var collection = require('*/cartridge/scripts/util/collections');
    var factory = require('*/cartridge/scripts/factories/product');

    return collection.map(apiProduct.variants, function (variant) {
        return factory.get({
            pid: variant.ID
        });
    });
}

module.exports = function (object, apiProduct, lineItem) {
    Object.defineProperty(object, 'isByobMaster', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.isByobMaster
    });
    if (empty(lineItem) && object.isByobMaster) {
        Object.defineProperty(object, 'byobVariants', {
            enumerable: true,
            writable: true,
            value: getByobVariant(apiProduct)
        });
    }
    if (empty(lineItem) && object.isByobMaster && !object.master) {
        Object.defineProperty(object, 'byobVariantSize', {
            enumerable: true,
            writable: true,
            value: apiProduct.custom.multipack
        });
    }
    if (!empty(lineItem) && !empty(lineItem.custom.boxID)) {
        Object.defineProperty(object, 'boxId', {
            enumerable: true,
            writable: true,
            value: lineItem.custom.boxID
        });
    }
    if (!empty(lineItem) && !empty(lineItem.custom.boxContents)) {
        Object.defineProperty(object, 'boxContents', {
            enumerable: true,
            writable: true,
            value: lineItem.custom.boxContents
        });
    }
};
