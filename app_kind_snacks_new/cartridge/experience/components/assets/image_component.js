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
    model.cta = content.cta;
    model.ctalink = content.ctalink;
    if (content.image) {
        model.image = {
            src: {
                mobile  : ImageTransformation.url(content.image, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image, { device: 'desktop' })
            },
            alt         : content.image.file.getAlt(),
            focalPointX : content.image.focalPoint.x * 100 + '%',
            focalPointY : content.image.focalPoint.y * 100 + '%'
        };
    }
    if (content.overlay_image) {
        model.overlay_image = {
            src: {
                mobile  : ImageTransformation.url(content.overlay_image, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.overlay_image, { device: 'desktop' })
            },
            alt         : content.overlay_image.file.getAlt(),
            focalPointX : content.overlay_image.focalPoint.x * 100 + '%',
            focalPointY : content.overlay_image.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/image_component').render(model).text;
};
