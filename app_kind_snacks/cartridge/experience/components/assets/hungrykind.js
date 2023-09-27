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
    }
    if (content.copy) {
        model.copy = content.copy;
    }
    if (content.background) {
        model.background = content.background.value;
    }
   
    if (content.icon) {
        model.icon = {
            src: {
                mobile  : ImageTransformation.url(content.icon, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.icon, { device: 'desktop' })
            },
            alt         : content.icon.file.getAlt(),
            focalPointX : content.icon.focalPoint.x * 100 + '%',
            focalPointY : content.icon.focalPoint.y * 100 + '%'
        };
    }
    model.bannerClass = "";
    if (content.guardrailed) {
        model.bannerClass += "guardrailed";
    }

    return new Template('experience/components/assets/hungrykind').render(model).text;
};
