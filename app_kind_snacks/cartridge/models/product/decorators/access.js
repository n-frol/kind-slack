'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'isBlockedAccess', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.isBlockedAccess
    });
};
