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
    model.columnmobile = content.widthmobile1;
    model.columnmobile2 = content.widthmobile2;
    model.maxheight = content.maxheight;
    model.column1align = content.column1align;
    model.column2align = content.column2align;

    model.id = makeid(12)
    model.id2 = makeid(12)

    // automatically register configured regions
    model.regions = PageRenderHelper.getRegionModelRegistry(component);

    return new Template('experience/components/layouts/2columnw').render(model).text;
};

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }