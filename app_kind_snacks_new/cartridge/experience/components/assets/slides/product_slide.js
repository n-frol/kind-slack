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

    model.product = content.product;

    return new Template('experience/components/slides/product_slider').render(model).text;
};
