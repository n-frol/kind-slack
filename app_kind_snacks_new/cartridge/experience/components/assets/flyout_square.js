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
    model.copy = content.copy;
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
    model.flyout_image = {
        src: {
            mobile  : ImageTransformation.url(content.flyout_image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.flyout_image, { device: 'desktop' })
        },
        alt         : content.flyout_image.file.getAlt(),
        focalPointX : content.flyout_image.focalPoint.x * 100 + '%',
        focalPointY : content.flyout_image.focalPoint.y * 100 + '%'
    };

    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);

    return new Template('experience/components/flyout_square').render(model).text;
};
