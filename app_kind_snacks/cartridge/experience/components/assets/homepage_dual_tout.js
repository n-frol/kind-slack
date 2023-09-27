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
        model.link = content.link
    }
    if (content.header_r) {
        model.header_r = content.header_r;
        model.link_r = content.link_r;
    }
    if (content.copy) {
        model.copy = content.copy;
    }
    if (content.copy_r) {
        model.copy_r = content.copy_r;
    }
    if (content.extra_class) {
        model.extra_class = content.extra_class;
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
    }
   
    if (content.small_image_r) {
        model.image_r = {
            src: {
                mobile  : ImageTransformation.url(content.small_image_r, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.small_image_r, { device: 'desktop' })
            },
            alt         : content.small_image_r.file.getAlt(),
            focalPointX : content.small_image_r.focalPoint.x * 100 + '%',
            focalPointY : content.small_image_r.focalPoint.y * 100 + '%'
        };
    }
    model.bannerClass = "";
    if (content.guardrailed) {
        model.bannerClass += "guardrailed";
    }

    return new Template('experience/components/assets/homepage_dual_tout').render(model).text;
};
