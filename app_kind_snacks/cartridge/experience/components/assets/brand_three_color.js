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

    if (content.copy) {
        model.copy = content.copy;
        model.header = content.header;
        model.color = content.color;
    }

    return new Template('experience/components/assets/brand_three_color').render(model).text;
};
