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
    var options = [];

    if (content.text) {
        var textarr = content.text.split(',');
        textarr.forEach(function(element) {
            var tarr = element.split(":");
            options.push({text:tarr[0], anchor:tarr[1]});
          });
        model.options = options;    
    }

    return new Template('experience/components/assets/scrollingdropdown').render(model).text;
};
