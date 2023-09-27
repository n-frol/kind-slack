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
    }
    if (content.background_tab) {
        model.image_tab = {
            src: {
                mobile  : ImageTransformation.url(content.background_tab, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background_tab, { device: 'desktop' })
            },
            alt         : content.background_tab.file.getAlt(),
            focalPointX : content.background_tab.focalPoint.x * 100 + '%',
            focalPointY : content.background_tab.focalPoint.y * 100 + '%'
        };
    }
    if (content.background_mobile) {
        model.image_mobile = {
            src: {
                mobile  : ImageTransformation.url(content.background_mobile, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background_mobile, { device: 'desktop' })
            },
            alt         : content.background_mobile.file.getAlt(),
            focalPointX : content.background_mobile.focalPoint.x * 100 + '%',
            focalPointY : content.background_mobile.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/assets/largething').render(model).text;
};
