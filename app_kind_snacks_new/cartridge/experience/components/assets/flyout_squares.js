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
    model.copy = content.copy;
    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);
    model.theme = content.theme;

    return new Template('experience/components/flyout_squares').render(model).text;
};
