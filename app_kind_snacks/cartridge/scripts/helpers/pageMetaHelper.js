/* global empty */
'use strict';

var Resource = require('dw/web/Resource');

var base = module.superModule;

/**
 * Set page meta Data including page title, page description and page keywords
 *
 * @param {Object} pageMetaData - Global request pageMetaData object
 * @param {Object} object - object which contains page meta data for instance product/content
 */
function setPageMetaData(pageMetaData, object) {
    var title = '';

    if (object === null) {
        return;
    }

    if ('pageTitle' in object && !empty(object.pageTitle)) {
        title = object.pageTitle;
    } else {
        if ('categorySlug' in object && !empty(object.categorySlug)) {
            title = object.categorySlug;
        } else if ('productName' in object && !empty(object.productName)) {
            title = object.productName;

            if ('productTypeDetail' in object && !empty(object.productTypeDetail)) {
                title += ' ' + object.productTypeDetail;
            }
        } else if ('name' in object && !empty(object.name)) {
            title = object.name;
        }

        if (title) {
            title += ' | ';
        }

        title += Resource.msg('global.storename', 'common', null);
    }

    pageMetaData.setTitle(title);

    var description = '';
    if ('pageDescription' in object && !empty(object.pageDescription)) {
        description = object.pageDescription;
    } else if ('shortDescription' in object && !empty(object.shortDescription)) {
        description = object.shortDescription;
    }

    if (!empty(description)) {
        // strip newlines
        description = description.replace(/(\r\n\t|\n|\r\t)/gm, "");

        // if longer than 155 characters, truncate and append ellipsis
        if (description.length > 155) {
            description = description.substring(0, 155) + '...';
        }

        pageMetaData.setDescription(description);
    }

    if ('pageKeywords' in object && !empty(object.pageKeywords)) {
        pageMetaData.setKeywords(object.pageKeywords);
    }
}

module.exports = {
    setPageMetaData: setPageMetaData,
    setPageMetaTags: base.setPageMetaTags
};

