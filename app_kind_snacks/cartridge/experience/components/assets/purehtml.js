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
    return new Template('experience/components/assets/purehtml').render(model).text;
};
