'use strict';

var folderHelpers = require('*/cartridge/scripts/util/folderHelpers');

/**
 * Represents folder model
 * @param  {dw.content.Folder} folderValue - result of ContentMgr.getFolder call
 * @param  {string} renderingTemplate - rendering template for the given folder
 * @return {void}
 * @constructor
 */
function folder(folderValue, renderingTemplate) {
    if (!folderValue.online) {
        return null;
    }

    var usedRenderingTemplate = renderingTemplate || 'components/content/contentAssetInc';

    this.body = (folderValue && folderValue.description) || null;
    this.ID = folderValue.ID;
    this.name = folderValue.displayName;
    this.description = folderValue.description;
    this.subfolders = folderHelpers.getOnlineSubfolders(folderValue);
    this.content = folderHelpers.getOnlineContent(folderValue);
    this.template = folderValue.template || usedRenderingTemplate;
    this.pageTitle = folderValue.pageTitle;
    this.pageDescription = folderValue.pageDescription;
    this.pageKeywords = folderValue.pageKeywords;

    return this;
}

module.exports = folder;
