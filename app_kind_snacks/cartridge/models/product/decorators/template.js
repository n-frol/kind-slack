'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'template', {
        enumerable: true,
        writable: true,
        value: apiProduct.template
    });
};
