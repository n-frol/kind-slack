'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'featuredHeading', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.featuredHeading
    });
    Object.defineProperty(object, 'notInProductLabel', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.notInProductLabel
    });
    Object.defineProperty(object, 'notInProductBody', {
        enumerable: true,
        writable: true,
        value: apiProduct.custom.notInProductBody
    });

    var outFeaturedAssets = [];
    for (var i = 0; i < apiProduct.custom.featuredAssets.length; i++) {
        outFeaturedAssets.push(apiProduct.custom.featuredAssets[i]);
    }
    Object.defineProperty(object, 'featuredAssets', {
        enumerable: true,
        writable: true,
        value: outFeaturedAssets
    });
};
