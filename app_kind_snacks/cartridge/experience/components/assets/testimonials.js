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

    if (content.name) {
        model.name = content.name;
        model.title = content.title;
        model.quote = content.quote;
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

    if (content.name2) {
        model.name2 = content.name2;
        model.title2 = content.title2;
        model.quote2 = content.quote2;
    }

    if (content.image2) {
        model.image2 = {
            src: {
                mobile  : ImageTransformation.url(content.image2, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image2, { device: 'desktop' })
            },
            alt         : content.image2.file.getAlt(),
            focalPointX : content.image2.focalPoint.x * 100 + '%',
            focalPointY : content.image2.focalPoint.y * 100 + '%'
        };
    }

    if (content.name3) {
        model.name3 = content.name3;
        model.title3 = content.title3;
        model.quote3 = content.quote3;
    }

    if (content.image3) {
        model.image3 = {
            src: {
                mobile  : ImageTransformation.url(content.image3, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image3, { device: 'desktop' })
            },
            alt         : content.image3.file.getAlt(),
            focalPointX : content.image3.focalPoint.x * 100 + '%',
            focalPointY : content.image3.focalPoint.y * 100 + '%'
        };
    }
    
    return new Template('experience/components/assets/testimonials').render(model).text;
};
