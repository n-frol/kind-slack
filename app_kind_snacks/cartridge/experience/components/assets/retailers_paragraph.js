/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('~/cartridge/experience/utilities/ImageTransformation.js');
var URLUtils = require('dw/web/URLUtils');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;
    
    if (content.left_text) {
        model.left_text = content.left_text;
    }
    if (content.right_text) {
        model.right_text = content.right_text;
    }
    if (content.bottom_text) {
        model.bottom_text = content.bottom_text;
    }
    if (content.image_grid_content_asset) {
        model.image_grid_content_asset = content.image_grid_content_asset;
    }
    model.dotted_border = URLUtils.staticURL('/images/header-stitching.png');
    
    if (content.paragraph_pattern) {
        model.paragraph_pattern = {
            src: {
                mobile  : ImageTransformation.url(content.paragraph_pattern, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.paragraph_pattern, { device: 'desktop' })
            },
            alt         : content.paragraph_pattern.file.getAlt(),
            focalPointX : content.paragraph_pattern.focalPoint.x * 100 + '%',
            focalPointY : content.paragraph_pattern.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/assets/retailers_paragraph').render(model).text;
};
