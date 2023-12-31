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

    return new Template('experience/components/assets/b2bapply').render(model).text;
};
