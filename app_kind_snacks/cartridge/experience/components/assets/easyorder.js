/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');

/**
 * Render logic for the assets.occasionsimage.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.rootcategory = content.rootcategory;
    model.productcategory = content.productcategory;
    model.header = content.header;
    model.copy = content.copy;
    model.copyrejected = content.copyrejected;

    return new Template('experience/components/assets/easyorder').render(model).text;
};
