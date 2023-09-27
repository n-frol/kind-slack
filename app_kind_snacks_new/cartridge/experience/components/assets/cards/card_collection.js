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

    model.headline = content.headline;

    model.headerul = content.headerul;
    if (content.descriptionul) {
        model.descriptionul = content.descriptionul;
    }
    if (content.ctaul) {
        model.ctaul = content.ctaul;
    }
    model.positionul = content.positionul;
    model.themeul = content.themeul;

    if (content.imageul) {
        model.imageul = {
            src: {
                mobile  : ImageTransformation.url(content.imageul, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.imageul, { device: 'desktop' })
            },
            alt         : content.imageul.file.getAlt(),
            focalPointX : content.imageul.focalPoint.x * 100 + '%',
            focalPointY : content.imageul.focalPoint.y * 100 + '%'
        };
    }

    model.headerur = content.headerur;
    if (content.descriptionur) {
        model.descriptionur = content.descriptionur;
    }
    if (content.ctaur) {
        model.ctaur = content.ctaur;
    }
    model.positionur = content.positionur;
    model.themeur = content.themeur;

    if (content.imageur) {
        model.imageur = {
            src: {
                mobile  : ImageTransformation.url(content.imageur, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.imageur, { device: 'desktop' })
            },
            alt         : content.imageur.file.getAlt(),
            focalPointX : content.imageur.focalPoint.x * 100 + '%',
            focalPointY : content.imageur.focalPoint.y * 100 + '%'
        };
    }

    model.headerbl = content.headerbl;
    if (content.descriptionbl) {
        model.descriptionbl = content.descriptionbl;
    }
    if (content.ctabl) {
        model.ctabl = content.ctabl;
    }
    model.positionbl = content.positionbl;
    model.themebl = content.themebl;

    if (content.imagebl) {
        model.imagebl = {
            src: {
                mobile  : ImageTransformation.url(content.imagebl, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.imagebl, { device: 'desktop' })
            },
            alt         : content.imagebl.file.getAlt(),
            focalPointX : content.imagebl.focalPoint.x * 100 + '%',
            focalPointY : content.imagebl.focalPoint.y * 100 + '%'
        };
    }

    model.headerbr = content.headerbr;
    if (content.descriptionbr) {
        model.descriptionbr = content.descriptionbr;
    }
    if (content.ctabr) {
        model.ctabr = content.ctabr;
    }
    model.positionbr = content.positionbr;
    model.themebr = content.themebr;

    if (content.imagebr) {
        model.imagebr = {
            src: {
                mobile  : ImageTransformation.url(content.imagebr, { device: 'mobile' }),
                desktop : ImageTransformation.url(content.imagebr, { device: 'desktop' })
            },
            alt         : content.imagebr.file.getAlt(),
            focalPointX : content.imagebr.focalPoint.x * 100 + '%',
            focalPointY : content.imagebr.focalPoint.y * 100 + '%'
        };
    }

    return new Template('experience/components/cards/collection2').render(model).text;
};
