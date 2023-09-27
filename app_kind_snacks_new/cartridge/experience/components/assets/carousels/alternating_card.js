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
    model.description = content.description;
    model.padding = content.padding;
    model.paddingm = content.paddingm;
    if (content.ctatext) {
        model.ctatext = content.ctatext;
        model.ctalink = content.ctalink;
    }
    model.background = content.background;
    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);

    model.image = {
        src: {
            mobile  : ImageTransformation.url(content.image, { device: 'mobile' }),
            desktop : ImageTransformation.url(content.image, { device: 'desktop' })
        },
        alt         : content.image.file.getAlt(),
        focalPointX : content.image.focalPoint.x * 100 + '%',
        focalPointY : content.image.focalPoint.y * 100 + '%'
    };

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

    function makeid(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    model.theid = makeid(16);

    return new Template('experience/components/carousel/alternating_card').render(model).text;
};
