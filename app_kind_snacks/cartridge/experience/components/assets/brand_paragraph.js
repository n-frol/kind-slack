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

    if (content) {
        model.eyebrow = content.eyebrow;
        model.eyebrowcolor = content.eyebrowcolor;
        model.header = content.header;
        model.paragraph = content.paragraph;
        model.anchor = content.anchor;
    }

    return new Template('experience/components/assets/brand_paragraph').render(model).text;
};
