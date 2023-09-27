/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('*/cartridge/experience/utilities/ImageTransformation.js');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.headline = content.headline;
    model.description = content.description;
    model.theme = content.theme;
    model.image = {
        src: {
            mobile  : ImageTransformation.url(content.image, { width: 'mobile' }),
            desktop : ImageTransformation.url(content.image, { device: 'fullwidth' })
        },
        alt         : content.image.file.getAlt(),
        focalPointX : content.image.focalPoint.x * 100 + '%',
        focalPointY : content.image.focalPoint.y * 100 + '%'
    };

    return new Template('experience/components/three_column_slide').render(model).text;
};
