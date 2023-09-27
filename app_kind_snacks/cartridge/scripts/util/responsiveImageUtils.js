/* global empty */
'use strict';

var urlEncodeSpaces = require("~/cartridge/scripts/util/stringHelpers").urlEncodeSpaces;
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');

/**
 * Encodes transformed image url and encodes any spaces
 *
 * @param {Object} image - a MediaFile object
 * @param {integer} imageSize - the requested image size
 * @returns {string} the encoded image URL
 *
 */
function getTransformedImage(image, imageSize) {
    return urlEncodeSpaces(image.getAbsImageURL({ scaleWidth: imageSize }));
}

/**
 * Returns an object with the appropriate transformed images
 *
 * @param {Object} image - An mediafile object
 * @param {integer} imageSizeDefaultIn - Default image size
 * @param {integer} imageSizeLargeIn - Large image size
 * @param {string} imageAltExplicit - Override alt text
 * @returns {Object} Object with image properties
 *
 */
function getResponsiveImage(image, imageSizeDefaultIn, imageSizeLargeIn, imageAltExplicit) {
    var imageSizeDefault = Math.min(imageSizeDefaultIn || 800, 2000);
    var imageSizeLarge = Math.min(empty(imageSizeLargeIn) ? imageSizeDefault * 2 : imageSizeLargeIn, 2000);

    var imageUrlDefault;
    var imageUrlLarge;
    var imageAlt;

    if (!empty(image)) {
        if (!empty(imageSizeDefault)) {
            imageUrlDefault = getTransformedImage(image, imageSizeDefault);
        }

        if (!empty(imageSizeLarge)) {
            imageUrlLarge = getTransformedImage(image, imageSizeLarge);
        }

        imageAlt = imageAltExplicit || image.alt;
    } else {
        imageUrlDefault = URLUtils.staticURL('/images/noimagemedium.png');
        imageUrlLarge = URLUtils.staticURL('/images/noimagelarge.png');
        imageAlt = imageAltExplicit || Resource.msg('global.noimageavailable', 'locale', null);
    }

    var responsiveImage = {
        imageUrlDefault: imageUrlDefault,
        imageUrlLarge: imageUrlLarge,
        imageAlt: imageAlt
    };

    return responsiveImage;
}

module.exports = {
    getResponsiveImage: getResponsiveImage
};
