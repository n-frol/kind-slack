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
    model.cat = content.rootcat;
    model.carousel_type = content.carousel_type;
    model.recommenderitems = content.recommenderitems;
    model.slidescount = content.slidescount;
    model.hide_slider_controls = content.hide_slider_controls ? true : false;
    if (content.headline) {
        model.headline = content.headline;
    }
    return new Template('experience/components/assets/carousel').render(model).text;
};
