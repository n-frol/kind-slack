'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'backgroundColor', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.backgroundColor
    });
    Object.defineProperty(object, 'indexLifestyleImage', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.indexLifestyleImage
    });
};
