'use strict';

module.exports = function (object, apiProduct) {
    var masterId = apiProduct.ID;
    if (apiProduct.variant) {
        masterId = apiProduct.masterProduct.ID;
    }

    Object.defineProperty(object, 'masterId', {
        enumerable: true,
        writable: true,
        value: masterId
    });
};
