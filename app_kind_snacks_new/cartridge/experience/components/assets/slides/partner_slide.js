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

    model.copy = content.partnercopy;
    model.url = content.url;
    model.image = {
        src: {
            mobile  : ImageTransformation.url(content.partnerimage, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.partnerimage, { device: 'desktop' })
        },
        alt         : content.partnerimage.file.getAlt(),
        focalPointX : content.partnerimage.focalPoint.x * 100 + '%',
        focalPointY : content.partnerimage.focalPoint.y * 100 + '%'
    };

    return new Template('experience/components/slides/partner_slide').render(model).text;
};
