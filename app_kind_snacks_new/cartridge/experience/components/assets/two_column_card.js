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

    if (content.headline) {
        model.headline = content.headline;
    }
    if (content.copy) {
        model.copy = content.copy;
    }
    model.innerheadline = content.innerheadline;
    model.innercopy = content.innercopy;

    model.textcolor = content.textcolor;
    model.backgroundcolor = content.backgroundcolor;
    model.direction = content.direction;
    model.inner_align = content.inner_align;
    model.inner_align_t = content.inner_align_t;

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
    if (content.imagemobile) {
        model.imagemobile = {
            src: {
                mobile  : ImageTransformation.url(content.imagemobile, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.imagemobile, { device: 'desktop' })
            },
            alt         : content.imagemobile.file.getAlt(),
            focalPointX : content.imagemobile.focalPoint.x * 100 + '%',
            focalPointY : content.imagemobile.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/two_column_card').render(model).text;
};
