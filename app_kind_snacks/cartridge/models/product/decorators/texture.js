'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'texture', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.texture
    });
};
