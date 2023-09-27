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

    if (content.richtext) {
        model.richtext = content.richtext;
    }

    if (content.background) {
        model.image = {
            src: {
                mobile  : ImageTransformation.url(content.background, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background, { device: 'desktop' })
            },
            alt         : content.background.file.getAlt(),
            focalPointX : content.background.focalPoint.x * 100 + '%',
            focalPointY : content.background.focalPoint.y * 100 + '%'
        };
    }

    if (content.image) {
        model.image2 = {
            src: {
                mobile  : ImageTransformation.url(content.image, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image, { device: 'desktop' })
            },
            alt         : content.image.file.getAlt()
        };
    }

    return new Template('experience/components/assets/bottombanner').render(model).text;
};
