'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'online', {
        enumerable: true,
        writable: true,
        value: apiProduct ? !!apiProduct.online : false
    });
};

