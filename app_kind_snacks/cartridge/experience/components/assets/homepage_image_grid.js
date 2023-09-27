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

    if (content.hero_text) {
        model.hero_text = content.hero_text;
    }
    if (content.copy_text) {
        model.copy_text = content.copy_text;
    }
    if (content.image_first) {
        model.image_first = {
            src: {
                mobile  : ImageTransformation.url(content.image_first, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image_first, { device: 'desktop' })
            },
            alt         : content.image_first.file.getAlt(),
            focalPointX : content.image_first.focalPoint.x * 100 + '%',
            focalPointY : content.image_first.focalPoint.y * 100 + '%'
        };
    }
    if (content.image_second) {
        model.image_second = {
            src: {
                mobile  : ImageTransformation.url(content.image_second, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image_second, { device: 'desktop' })
            },
            alt         : content.image_second.file.getAlt(),
            focalPointX : content.image_second.focalPoint.x * 100 + '%',
            focalPointY : content.image_second.focalPoint.y * 100 + '%'
        };
    }
    if (content.image_third) {
        model.image_third = {
            src: {
                mobile  : ImageTransformation.url(content.image_third, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image_third, { device: 'desktop' })
            },
            alt         : content.image_third.file.getAlt(),
            focalPointX : content.image_third.focalPoint.x * 100 + '%',
            focalPointY : content.image_third.focalPoint.y * 100 + '%'
        };
    }
    if (content.image_fourth) {
        model.image_fourth = {
            src: {
                mobile  : ImageTransformation.url(content.image_fourth, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image_fourth, { device: 'desktop' })
            },
            alt         : content.image_fourth.file.getAlt(),
            focalPointX : content.image_fourth.focalPoint.x * 100 + '%',
            focalPointY : content.image_fourth.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/assets/homepage_image_grid').render(model).text;
};
