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

    model.headline = content.headline;
    model.theme = content.theme;
    model.showmode = content.showmode;
    model.showscroll = content.showscroll;
    model.showgradient = content.show_gradient;
    model.opacity = content.opacity;
    model.headline_lineheight = content.headline_lineheight;
    model.headline_fontsize = content.headline_fontsize;
    model.headline_lineheight_mobile = content.headline_lineheight_mobile;
    model.headline_fontsize_mobile = content.headline_fontsize_mobile;

    if (content.description) {
        model.description = content.description;
    }
    if (content.eyebrow) {
        model.eyebrow = content.eyebrow;
    }
    if (content.CTA1Text) {
        model.CTA1Text = content.CTA1Text;
        model.CTA1Link = content.CTA1Link;
        model.CTA1Aria = content.CTA1Aria;
    }
    if (content.CTA2Text) {
        model.CTA2Text = content.CTA2Text;
        model.CTA2Link = content.CTA2Link;
        model.CTA2Aria = content.CTA2Aria;
    }

    model.video = content.video;
    model.video_mobile = content.video_mobile;

    if (content.image) {
        model.image = {
            src: {
                mobile  : ImageTransformation.url(content.image, { width: 'mobile' }),
                desktop : ImageTransformation.url(content.image, { device: 'fullwidth' })
            },
            alt         : content.image.file.getAlt(),
            focalPointX : content.image.focalPoint.x * 100 + '%',
            focalPointY : content.image.focalPoint.y * 100 + '%'
        };
    }
    if (content.image_mobile) {
        model.image_mobile = {
            src: {
                mobile  : ImageTransformation.url(content.image_mobile, { device: 'mobile'}),
                desktop : ImageTransformation.url(content.image_mobile, { device: 'fullwidth'})
            },
            alt         : content.image_mobile.file.getAlt(),
            focalPointX : content.image_mobile.focalPoint.x * 100 + '%',
            focalPointY : content.image_mobile.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/banners/fullwidth2').render(model).text;
};
