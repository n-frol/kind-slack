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

    model.left_image = {
        src: {
            mobile  : ImageTransformation.url(content.left_image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.left_image, { device: 'desktop' })
        },
        alt         : content.left_image.file.getAlt(),
        focalPointX : content.left_image.focalPoint.x * 100 + '%',
        focalPointY : content.left_image.focalPoint.y * 100 + '%'
    };

    model.right_image = {
        src: {
            mobile  : ImageTransformation.url(content.right_image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.right_image, { device: 'desktop' })
        },
        alt         : content.right_image.file.getAlt(),
        focalPointX : content.right_image.focalPoint.x * 100 + '%',
        focalPointY : content.right_image.focalPoint.y * 100 + '%'
    };

    model.mid_image = {
        src: {
            mobile  : ImageTransformation.url(content.mid_image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.mid_image, { device: 'desktop' })
        },
        alt         : content.mid_image.file.getAlt(),
        focalPointX : content.mid_image.focalPoint.x * 100 + '%',
        focalPointY : content.mid_image.focalPoint.y * 100 + '%'
    };

    model.mid_image2 = {
        src: {
            mobile  : ImageTransformation.url(content.mid_image2, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.mid_image2, { device: 'desktop' })
        },
        alt         : content.mid_image2.file.getAlt(),
        focalPointX : content.mid_image2.focalPoint.x * 100 + '%',
        focalPointY : content.mid_image2.focalPoint.y * 100 + '%'
    };

    model.full_image = content.full_image;

    return new Template('experience/components/immersive_header3').render(model).text;
};
