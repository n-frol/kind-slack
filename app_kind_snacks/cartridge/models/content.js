'use strict';

var base = module.superModule;
var URLUtils = require('dw/web/URLUtils');

/**
 * Represents content model
 * @param  {dw.content.Content} contentValue - result of ContentMgr.getContent call
 * @param  {string} renderingTemplate - rendering template for the given content
 * @return {void}
 * @constructor
 */
function content(contentValue, renderingTemplate) {
    base.apply(this, [contentValue, renderingTemplate]);

    this.custom = contentValue.custom;
    this.url = URLUtils.url('Page-Show', 'cid', contentValue.ID);

    if (contentValue.classificationFolder) {
        this.classificationFolder = {
            id: contentValue.classificationFolder.ID,
            pageUrl: contentValue.classificationFolder.getPageURL()
        };
    }

    return this;
}

module.exports = content;
