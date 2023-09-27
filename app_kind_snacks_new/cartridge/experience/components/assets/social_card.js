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

    model.text = content.text;
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
    model.imagemobile = {
        src: {
            mobile  : ImageTransformation.url(content.imagemobile, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.imagemobile, { device: 'desktop' })
        },
        alt         : content.imagemobile.file.getAlt(),
        focalPointX : content.imagemobile.focalPoint.x * 100 + '%',
        focalPointY : content.imagemobile.focalPoint.y * 100 + '%'
    };

    return new Template('experience/components/social_card').render(model).text;
};
