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
    
    model.hero_height = '';

    if (content.hero_height) {
        model.hero_height = content.hero_height;
    }
    if (content.hero_text) {
        model.hero_text = content.hero_text;
    }
    if (content.copy_text) {
        model.copy_text = content.copy_text;
    }
    if (content.background_color) {
        model.background_color = content.background_color.value;
    }
    if (content.button_text) {
        model.button_text = content.button_text;
    }
    if (content.button_link) {
        model.button_link = content.button_link;
    }
    if (content.background_image) {
        model.background_image = {
            src: {
                mobile  : ImageTransformation.url(content.background_image, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background_image, { device: 'desktop' })
            },
            alt         : content.background_image.file.getAlt(),
            focalPointX : content.background_image.focalPoint.x * 100 + '%',
            focalPointY : content.background_image.focalPoint.y * 100 + '%'
        };
    }
    if (content.background_image_mobile) {
        model.background_image_mobile = {
            src: {
                mobile  : ImageTransformation.url(content.background_image_mobile, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background_image_mobile, { device: 'desktop' })
            },
            alt         : content.background_image_mobile.file.getAlt(),
            focalPointX : content.background_image_mobile.focalPoint.x * 100 + '%',
            focalPointY : content.background_image_mobile.focalPoint.y * 100 + '%'
        };
    }
    if (content.content_image) {
        model.content_image = {
            src: {
                mobile  : ImageTransformation.url(content.content_image, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.content_image, { device: 'desktop' })
            },
            alt         : content.content_image.file.getAlt(),
            focalPointX : content.content_image.focalPoint.x * 100 + '%',
            focalPointY : content.content_image.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/assets/homepage_hero').render(model).text;
};
