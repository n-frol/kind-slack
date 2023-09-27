/* global empty */
'use strict';

module.exports = function (object, apiProduct) {
    // CC Set of Strings type can't properly serialize to JSON, so we need to convert this to a
    // vanilla JS array

    if (!empty(apiProduct.custom.benefits)) {
        var outBenefits = [];
        for (var i = 0; i < apiProduct.custom.benefits.length; i++) {
            outBenefits.push(apiProduct.custom.benefits[i]);
        }

        Object.defineProperty(object, 'benefits', {
            enumerable: true,
            writable: true,
            value: outBenefits
        });
    }
};
