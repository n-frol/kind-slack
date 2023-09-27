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

    model.heading = content.heading;
    if (content.description) {
        model.description = content.description;
    }
    if (content.eyebrow) {
        model.eyebrow = content.eyebrow;
    }
    model.layout = content.layout;
    model.show_gradient = content.show_gradient;
    model.cta = content.cta;
    model.ctalink = content.ctalink;
    model.ctaaira = content.ctaaira;
    model.bgcolor = content.bgcolor;

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

    if (content.image_mobile) {
        model.image_mobile = {
            src: {
                mobile  : ImageTransformation.url(content.image_mobile, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image_mobile, { device: 'desktop' })
            },
            alt         : content.image_mobile.file.getAlt(),
            focalPointX : content.image_mobile.focalPoint.x * 100 + '%',
            focalPointY : content.image_mobile.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/cards/content_card').render(model).text;
};
