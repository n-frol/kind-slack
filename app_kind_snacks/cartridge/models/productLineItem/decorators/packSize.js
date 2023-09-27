'use strict';

module.exports = function (object, apiProduct) {
    var masterId = apiProduct.custom.size;

    Object.defineProperty(object, 'packSize', {
        enumerable: true,
        writable: true,
        value: masterId
    });
};
