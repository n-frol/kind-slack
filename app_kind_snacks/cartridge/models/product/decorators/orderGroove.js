'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'autoShipEligible', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.autoShipEligible
    });
    Object.defineProperty(object, 'impulseUpsell', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.impulseUpsell
    });
};
