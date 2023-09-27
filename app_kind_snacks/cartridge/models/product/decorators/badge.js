'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'badge', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.badge
    });
};
