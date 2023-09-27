/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('*/cartridge/experience/utilities/ImageTransformation.js');
var getResponsiveImage = require('app_kind_components/cartridge/scripts/util/responsiveImageUtils')
var PageRenderHelper = require('*/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.name = content.name;
    model.showstars = content.showstars;
    if (content.description) {
        model.description = content.description;
    }
    if (content.CTA1Text) {
        model.CTA1Text = content.CTA1Text;
        model.CTA1Link = content.CTA1Link;
        model.CTA1Aria = content.CTA1Aria;
    }
    if (content.eyebrow) {
        model.eyebrow = content.eyebrow;
    }
    model.product = content.product;

    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);

    model.product_image = model.product.getImages('large')[0];
    model.image_url = ImageTransformation.url(model.product_image, { device: 'desktop' })
    model.image_url_mobile = ImageTransformation.url(model.product_image, { device: 'mobile' })

    model.prodimg = getResponsiveImage.getResponsiveImage(model.product_image, 800, 400, null, "png");
    model.prodimgmobile = getResponsiveImage.getResponsiveImage(model.product_image, 400, 400, null, "png");

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

    return new Template('experience/components/banners/product_dual').render(model).text;
};
