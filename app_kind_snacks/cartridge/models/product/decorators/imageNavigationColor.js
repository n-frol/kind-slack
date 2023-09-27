'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'imageNavigationColor', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.imageNavigationColor
    });
};
