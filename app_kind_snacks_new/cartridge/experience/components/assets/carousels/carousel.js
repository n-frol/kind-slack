/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('*/cartridge/experience/utilities/PageRenderHelper.js');
/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.headline = content.headline;
    model.headingfont = content.headline_font;
    model.headingline = content.headline_line;
    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);
    model.theme = content.theme;
    model.showviewall = content.showviewall;
    if (content.description) {
        model.description = content.description;
    }
    model.slideswidth = content.slideswidth;
    model.slideswidthmobile = content.slideswidthmobile;

    return new Template('experience/components/carousel/carousel_container').render(model).text;
};
