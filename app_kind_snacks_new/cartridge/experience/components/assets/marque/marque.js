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

    model.theme = content.theme;
    model.moving = content.moving;
    model.regions = PageRenderHelper.getRegionModelRegistry(context.component);

    return new Template('experience/components/marque/marque').render(model).text;
};
