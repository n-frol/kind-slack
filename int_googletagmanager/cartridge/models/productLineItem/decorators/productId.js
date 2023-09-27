'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'productId', {
        value: apiProduct.productID
    });
};



