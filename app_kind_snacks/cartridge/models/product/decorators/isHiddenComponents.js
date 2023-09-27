'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'isHiddenComponents', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.isHiddenComponents
    });
};
