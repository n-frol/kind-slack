/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var ImageTransformation = require('~/cartridge/experience/utilities/ImageTransformation.js');

/**
 * Render logic for video component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    if (content.video) {
        model.video = content.video;
    }
    
    if (content.youtubeurl && !content.video) {
        model.youtube = content.youtubeurl;
        if (content.youtubeurl.indexOf('embed') == -1) {
            var ytId = content.youtubeurl.split('=');
            model.youtube = 'https://www.youtube.com/embed/' + ytId[1];
        }
    }

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

    return new Template('experience/components/assets/video_component').render(model).text;
};
