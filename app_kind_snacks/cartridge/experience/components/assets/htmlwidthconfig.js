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
    model.html = content.html;
    model.parentheight = content.parentheight;
    model.width = content.width;

    return new Template('experience/components/assets/html').render(model).text;
};
