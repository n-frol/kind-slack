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

    if (content.richtext) {
        model.richtext = content.richtext;
    }
    if (content.background) {
        model.background = content.background;
    }

    return new Template('experience/components/assets/fullwidthpromo').render(model).text;
};
