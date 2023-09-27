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
    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);

    return new Template('experience/components/carousel/alternating_cards').render(model).text;
};
