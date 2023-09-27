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

    if (content.bannertext) {
        model.bannertext = content.bannertext;
        model.headertext = content.headertext;
        model.copytext = content.copytext;
        model.anchor = content.anchor;
        model.pid  = content.productid;

        model.bannertext2 = content.bannertext2;
        model.headertext2 = content.headertext2;
        model.copytext2 = content.copytext2;
        model.anchor2 = content.anchor2;
        model.pid2  = content.productid2;
    }

    if (content.background) {
        model.image = {
            src: {
                mobile  : ImageTransformation.url(content.background, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background, { device: 'desktop' })
            },
            alt         : content.background.file.getAlt(),
            focalPointX : content.background.focalPoint.x * 100 + '%',
            focalPointY : content.background.focalPoint.y * 100 + '%'
        };

        model.image2 = {
            src: {
                mobile  : ImageTransformation.url(content.background2, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background2, { device: 'desktop' })
            },
            alt         : content.background2.file.getAlt(),
            focalPointX : content.background2.focalPoint.x * 100 + '%',
            focalPointY : content.background2.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/assets/mediumthing').render(model).text;
};
