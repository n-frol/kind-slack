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

    model.ol = content.textl;;
    model.or = content.textr;
    model.olp = content.textlp;
    model.orp = content.textrp;
    model.olm = content.textlm;
    model.orm = content.textrm;
    model.ou = content.textu;
    model.ob = content.textb;
    model.oup = content.textup;
    model.obp = content.textbp;
    model.oum = content.textum;
    model.obm = content.textbm;
    model.text = content.textcontent;

    model.id = makeid(12)
    model.id2 = makeid(12)


    if (content.background) {
        model.background = {
            src: {
                mobile  : ImageTransformation.url(content.background, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.background, { device: 'desktop' })
            },
            alt         : content.background.file.getAlt(),
            focalPointX : content.background.focalPoint.x * 100 + '%',
            focalPointY : content.background.focalPoint.y * 100 + '%'
        };
    }
    if (content.backgroundipad) {
        model.backgroundipad = {
            src: {
                mobile  : ImageTransformation.url(content.backgroundipad, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.backgroundipad, { device: 'desktop' })
            },
            alt         : content.backgroundipad.file.getAlt(),
            focalPointX : content.backgroundipad.focalPoint.x * 100 + '%',
            focalPointY : content.backgroundipad.focalPoint.y * 100 + '%'
        };
    }
    if (content.backgroundm) {
        model.backgroundm = {
            src: {
                mobile  : ImageTransformation.url(content.backgroundm, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.backgroundm, { device: 'desktop' })
            },
            alt         : content.backgroundm.file.getAlt(),
            focalPointX : content.backgroundm.focalPoint.x * 100 + '%',
            focalPointY : content.backgroundm.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/assets/backgroundwithimage').render(model).text;
};


function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }