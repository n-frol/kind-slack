/* eslint-disable no-undef */
'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'tileHoverIndex', {
        enumerable: true,
        writable: true,
        value: !empty(apiProduct.custom.tileHoverIndex) ? apiProduct.custom.tileHoverIndex : 1
    });

    Object.defineProperty(object, 'tileHoverEnable', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.tileHoverEnable
    });

    Object.defineProperty(object, 'tileIndex', {
        enumerable: true,
        writable: true,
        value: !empty(apiProduct.custom.tileIndex) ? apiProduct.custom.tileIndex : 0
    });
};
