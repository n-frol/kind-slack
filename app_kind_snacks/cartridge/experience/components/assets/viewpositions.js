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
    if (content.header) {
        model.header = content.header;
    }
    if (content.copy) {
        model.copy = content.copy;
    }
    if (content.background) {
        model.background = content.background;
    }
    if (content.button2) {
        model.button2 = content.button2;
    }
    if (content.link) {
        model.link = content.link;
    }

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
    return new Template('experience/components/assets/viewpositions').render(model).text;
};
