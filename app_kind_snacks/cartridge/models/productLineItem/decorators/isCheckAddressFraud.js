/* global empty */
'use strict';

module.exports = function (object, apiProduct) {
    var isCheckAddressFraud = !empty(apiProduct.custom.isCheckAddressFraud) && apiProduct.custom.isCheckAddressFraud;

    Object.defineProperty(object, 'isCheckAddressFraud', {
        enumerable: true,
        writable: true,
        value: isCheckAddressFraud
    });
};

