/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var URLUtils = require('dw/web/URLUtils');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.rec_type = content.rec_type;
    model.force_infront = content.force_infront;
    model.categories = content.categories;
    model.max_slides = content.max_slides ? parseInt(content.max_slides) : 5;
    model.productLoadUrl = URLUtils.abs('Page-EinsteinCustom');

    return new Template('experience/components/assets/einstein_custom').render(model).text;
};
