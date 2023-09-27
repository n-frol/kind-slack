/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('*/cartridge/experience/utilities/ImageTransformation.js');
var PageRenderHelper = require('*/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.headline = content.headline;
    if (content.description) {
        model.description = content.description;
    }
    model.benefitsdirection = content.benefit_direction;
    model.bene_description = content.bene_description;
    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);
    model.overlaycolor = content.overlay_color;
    model.overlaytextcolor = content.overlay_text_color;
    model.headlinecolor = content.headlinecolor;

    var regs = PageRenderHelper.getRegionModelRegistry(context.component)
    var count = regs.benefits.region.size;
    var results = count/2;
    model.count = Math.round(results);

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
    if (content.image_mobile) {
        model.image_mobile = {
            src: {
                mobile  : ImageTransformation.url(content.image_mobile, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.image_mobile, { device: 'desktop' })
            },
            alt         : content.image_mobile.file.getAlt(),
            focalPointX : content.image_mobile.focalPoint.x * 100 + '%',
            focalPointY : content.image_mobile.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/banners/promotion_overlay').render(model).text;
};
