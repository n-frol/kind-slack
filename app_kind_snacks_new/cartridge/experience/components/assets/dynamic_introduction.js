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
    model.subcopy = content.subcopy;
    model.left_image = {
        src: {
            mobile  : ImageTransformation.url(content.left_image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.left_image, { device: 'desktop' })
        },
        alt         : content.left_image.file.getAlt(),
        focalPointX : content.left_image.focalPoint.x * 100 + '%',
        focalPointY : content.left_image.focalPoint.y * 100 + '%'
    };
    model.ur_image = {
        src: {
            mobile  : ImageTransformation.url(content.ur_image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.ur_image, { device: 'desktop' })
        },
        alt         : content.ur_image.file.getAlt(),
        focalPointX : content.ur_image.focalPoint.x * 100 + '%',
        focalPointY : content.ur_image.focalPoint.y * 100 + '%'
    };
    model.br_image = {
        src: {
            mobile  : ImageTransformation.url(content.br_image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.br_image, { device: 'desktop' })
        },
        alt         : content.br_image.file.getAlt(),
        focalPointX : content.br_image.focalPoint.x * 100 + '%',
        focalPointY : content.br_image.focalPoint.y * 100 + '%'
    };

    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);

    return new Template('experience/components/dynamic_introduction').render(model).text;
};
