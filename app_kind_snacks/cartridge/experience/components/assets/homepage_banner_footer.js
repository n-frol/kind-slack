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

    if (content.extra_class) {
        model.extra_class = content.extra_class;
    }
    model.banner_height = content.banner_height ? 'height: ' + content.banner_height + ';': 'height: auto;';
    if (content.eyebrow) {
        model.eyebrow = content.eyebrow;
    }
    if (content.header) {
        model.header = content.header;
    }
    if (content.copy) {
        model.copy = content.copy;
        model.copyfont = content.copyfont;
        model.copyweight = content.copyweight;
    }
    if (content.text_color) {
        model.text_color = content.text_color.value;
    }
    if (content.button) {
        model.button = content.button;
        model.buttonlink = content.buttonlink;
    }
    if (content.button_color) {
        model.button_color = content.button_color.value;
    }
    if (content.button_text_color) {
        model.button_text_color = content.button_text_color.value;
    }
    if (content.text_align) {
        model.text_align = content.text_align;
        model.text_container_align = content.text_container_align;
    }
    if (content.text_container_align) {
        model.text_container_align = content.text_container_align;
    }
    if (content.background_color) {
        model.background_color = content.background_color.value;
    }
    if (content.button2) {
        model.button2 = content.button2;
        model.button2link = content.button2link;
    }
    if (content.button_color2) {
        model.button_color2 = content.button_color2.value;
    }
    if (content.button_text_color2) {
        model.button_text_color2 = content.button_text_color2.value;
    }

    if (content.small_image) {
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

    model.textPad = "padText";
    if (content.full_image_use) {
        model.full_image_use = content.full_image_use;
        model.textPad = "";
    }

    model.resize = content.resize;
    
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

    model.bannerClass = "homepage_banner";
    if (model.small_image_align == "Left") {
        model.bannerClass += " grid-reverse";
    }
    if (model.full_image_use) {
        model.bannerClass += " fullscreen";
    }
    if (!model.image) {
        model.fullstyle = "grid-column:1/-1;";
    }

    model.componentId = 'cmt-' + Math.floor((Math.random()*1000) + 1);

    return new Template('experience/components/assets/homepage_banner_footer').render(model).text;
};
