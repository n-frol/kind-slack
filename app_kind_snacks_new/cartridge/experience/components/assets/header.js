/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.header = content.header;
    if (content.description) {
        model.description = content.description;
    }
    model.style = content.style;
    model.headersize = content.headersize;
    model.descriptionsize = content.descriptionsize;
    model.descriptionsizemobile = content.descriptionsizemobile;
    model.background = content.background.value;
    model.headersizemobile = content.headersizemobile;
    model.headerlh = content.headerlh;
    model.headerlhm = content.headerlhm;
    model.desclh = content.desclh;
    model.desclhm = content.desclhm;

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

    return new Template('experience/components/header').render(model).text;
};
