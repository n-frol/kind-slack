'use strict';

module.exports = function (object, apiProduct) {
    var pid = apiProduct.ID;
    if (apiProduct.variant) {
        pid = apiProduct.masterProduct.ID;
    }

    var ProductMgr = require('dw/catalog/ProductMgr');
    var prod = ProductMgr.getProduct(pid);
    var gmFlavor = Object.hasOwnProperty.call(prod.custom, 'gmFlavour') ? prod.custom.gmFlavour : "";

    Object.defineProperty(object, 'gmFlavor', {
        enumerable: true,
        writable: true,
        value: gmFlavor
    });
};
