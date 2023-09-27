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

    model.dl = content.deskwidthl;
    model.dr = content.deskwidthr;
    model.il = content.ipadl;
    model.ir = content.ipadr;
    model.ml = content.mobilel;
    model.mr = content.mobiler;

    model.id = makeid(12)
    model.id2 = makeid(12)


    if (content.rightimage) {
        model.rightimage = {
            src: {
                mobile  : ImageTransformation.url(content.rightimage, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.rightimage, { device: 'desktop' })
            },
            alt         : content.rightimage.file.getAlt(),
            focalPointX : content.rightimage.focalPoint.x * 100 + '%',
            focalPointY : content.rightimage.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/assets/b2bheader').render(model).text;
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