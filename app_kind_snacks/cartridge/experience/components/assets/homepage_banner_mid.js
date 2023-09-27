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

    if (content.eyebrow) {
        model.eyebrow = content.eyebrow;
    }
    model.hasText = "";
    if (content.header) {
        model.header = content.header;
    }
    if (content.copy) {
        model.copy = content.copy;
        model.link = content.link;
    }
    if (content.button) {
        model.button = content.button;
    }
    if (content.text_align) {
        model.text_align = content.text_align;
    }
    if (content.background_color) {
        model.background_color = content.background_color;
    }
    if (content.button2) {
        model.button2 = content.button2;
    }

    if (content.small_image) {
        model.hasText = "hastext";
        model.image = {
            src: {
                mobile  : ImageTransformation.url(content.small_image, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.small_image, { device: 'desktop' })
            },
            alt         : content.small_image.file.getAlt(),
            focalPointX : content.small_image.focalPoint.x * 100 + '%',
            focalPointY : content.small_image.focalPoint.y * 100 + '%'
        };
        model.small_image_align = content.small_image_align;
    }
    if (content.small_image_mobile) {
        model.image_mobile = {
            src: {
                mobile  : ImageTransformation.url(content.small_image_mobile, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.small_image_mobile, { device: 'desktop' })
            },
            alt         : content.small_image_mobile.file.getAlt(),
            focalPointX : content.small_image_mobile.focalPoint.x * 100 + '%',
            focalPointY : content.small_image_mobile.focalPoint.y * 100 + '%'
        };
    }

    if (content.full_image_use) {
        model.full_image_use = content.full_image_use;
    }

    if (content.full_image) {
        model.full_image = {
            src: {
                mobile  : ImageTransformation.url(content.full_image, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.full_image, { device: 'desktop' })
            },
            alt         : content.full_image.file.getAlt(),
            focalPointX : content.full_image.focalPoint.x * 100 + '%',
            focalPointY : content.full_image.focalPoint.y * 100 + '%'
        };
    }

    if (content.full_image_mobile) {
        model.full_image_mobile = {
            src: {
                mobile  : ImageTransformation.url(content.full_image_mobile, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.full_image_mobile, { device: 'desktop' })
            },
            alt         : content.full_image_mobile.file.getAlt(),
            focalPointX : content.full_image_mobile.focalPoint.x * 100 + '%',
            focalPointY : content.full_image_mobile.focalPoint.y * 100 + '%'
        };
    }

    model.bannerClass = "homepage_banner_mid";
    if (content.small_image_align == "right") {
        model.bannerClass += " grid-reverse";
    }
    if (model.full_image_use) {
        model.bannerClass += " fullscreen";
        model.fullClass = "fullspan overlapped";
    }
    model.noimage = "";
    if (!model.image) {
        model.backgroundcolumn = "1/-1"
        model.noimage = "noimage";
    } else {
        model.backgroundcolumn = "2";
    }
    if (content.guardrailed) {
        model.bannerClass += " guardrailed";
    }

    return new Template('experience/components/assets/homepage_banner_mid').render(model).text;
};
