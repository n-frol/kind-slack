/* global empty */
'use strict';

// Get around not having access to getAbsImageURL in the view
// Get responsive images of specific sizes for PDP primary slider
function responsiveSliderImages(product, normal, small) {
    var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');
    var images = product.getImages('large').toArray();
    var responsiveImages = [];
    var sizeNormal = normal || 800;
    var sizeSmall = small || 375;

    if (!empty(images)) {
        images.forEach(function (image) {
            responsiveImages.push({
                normal: responsiveImageUtils.getResponsiveImage(image, sizeNormal),
                small: responsiveImageUtils.getResponsiveImage(image, sizeSmall)
            });
        });
    }

    return responsiveImages;
}

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'responsiveImages', {
        enumerable: true,
        writable: true,
        value: responsiveSliderImages(apiProduct)
    });
};
