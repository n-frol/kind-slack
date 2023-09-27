/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the layouts.2column.
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var component = context.component;

    var content = context.content;
    if (content.width) {
        model.width = content.width;
    }
    model.col1width = content.widthcol1;
    model.col2width = content.widthcol2;
    model.columnmobile = content.widthmobile;
    model.maxheight = content.maxheight;
    model.center = content.center;
    model.hungrykind = content.hungrykind;
    model.hungrykind_1 = content.hungrykind_1;

    // automatically register configured regions
    model.regions = PageRenderHelper.getRegionModelRegistry(component);

    return new Template('experience/components/layouts/2columnwidth').render(model).text;
};
