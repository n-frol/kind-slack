'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('~/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for the dynamiclayout.
 *
 * @param {dw.experience.PageScriptContext} context The page script context object.
 *
 * @returns
 */
module.exports.render = function (context) {
    const StringUtils = require('dw/util/StringUtils');
    const parseJSON = require('*/cartridge/scripts/util/parseJSON');

    var model = new HashMap();
    var page = context.page;
    model.page = page;

    let renderParameters = parseJSON(context.renderParameters);
    let gtmPageData;
    if (renderParameters) {
        gtmPageData = renderParameters.gtmPageData;
    }

    // automatically register configured regions
    model.regions = PageRenderHelper.getRegionModelRegistry(page);

    // determine seo meta data
    model.CurrentPageMetaData = PageRenderHelper.getPageMetaData(page);

    model.decorator = PageRenderHelper.determineDecorator(context);

    if (PageRenderHelper.isInEditMode()) {
        dw.system.HookMgr.callHook('app.experience.editmode', 'editmode');
    }

    if (gtmPageData) {
        model.gtmPageData = { event: "pageInfo", page: parseJSON(StringUtils.decodeBase64(gtmPageData)) };
    }

    // render the page
    var expiryTime = new Date(Date.now());
    expiryTime.setMinutes(expiryTime.getMinutes() + 60);
    response.setExpires(expiryTime);
    return new Template('experience/pages/dynamiclayout').render(model).text;
};
