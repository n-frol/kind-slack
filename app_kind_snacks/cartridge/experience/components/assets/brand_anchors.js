/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('~/cartridge/experience/utilities/ImageTransformation.js');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    if (content.text) {
        model.text = content.text;
        model.anchor = content.link;
        model.underline_color = content.underline_color;
    }

    return new Template('experience/components/assets/brand_anchors').render(model).text;
};
