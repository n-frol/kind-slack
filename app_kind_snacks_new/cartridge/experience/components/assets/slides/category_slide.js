/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.category = content.category;
    var image = responsiveImageUtils.getResponsiveImage(model.category.custom.carousel_image, 300, 300, null, "png");
    var image_hover = responsiveImageUtils.getResponsiveImage(model.category.custom.carousel_image_hover, 300, 300, null, "png");
    model.image = image;
    model.image_hover = image_hover;

    return new Template('experience/components/slides/category_slide').render(model).text;
};
