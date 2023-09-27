'use strict';
module.exports = function (object, apiProduct) {
    var pid = apiProduct.ID;
    if (apiProduct.variant) {
        pid = apiProduct.masterProduct.ID;
    }

    var ProductMgr = require('dw/catalog/ProductMgr');
    var prod = ProductMgr.getProduct(pid);

    var badge = Object.hasOwnProperty.call(prod.custom, 'badge') ? prod.custom.badge.value : "";


    Object.defineProperty(object, 'badge', {
        enumerable: true,
        writable: true,
        value: badge
    });
};
