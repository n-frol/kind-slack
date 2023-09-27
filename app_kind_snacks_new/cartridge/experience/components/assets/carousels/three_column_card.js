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
    model.columnscount = content.columnscount;
    model.columnscountipad = content.columnscountipad;
    model.columnscountmobile = content.columnscountmobile;
    model.bgcolor = content.background.value;
    if (content.gridgap) {
        model.gridgap = content.gridgap;
    } else {
        model.gridgap = "40px";
    }
    if (content.maxwidth) {
        model.maxwidth = content.maxwidth;
    } else {
        model.maxwidth = "100%";
    }
    model.mobile_carousel = content.mobile_carousel;
    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);

    return new Template('experience/components/carousel/three_column_card').render(model).text;
};
