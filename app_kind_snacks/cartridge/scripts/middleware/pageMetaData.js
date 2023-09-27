'use strict';

var Velocity = require('dw/template/Velocity');
var StringWriter = require('dw/io/StringWriter');

var PageMetaDataUtilModel = require('*/cartridge/models/pageMetaDataUtilModel');

function parseVelocityTemplateGenerator(viewData) {
    if (!viewData.Util) {
        viewData.Util = new PageMetaDataUtilModel(viewData);
    }

    return function (tagContent) {
        var writer = new StringWriter();
        if (!viewData) {
            viewData = {}; // eslint-disable-line
        }
        try {
            Velocity.render(tagContent, viewData, writer);
            return writer.toString();
        } catch (e) {
            return tagContent;
        }
    };
}


/**
 * Middleware to compute request pageMetaData object/
 *
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next call in the middleware chain
 * @returns {void}
 */
function computedPageMetaData(req, res, next) {
    var hasJson = res.renderings.some(function (r) {
        return r.subType && r.subType === 'json';
    });
    if (hasJson) {
        return;
    }
    var tpl = parseVelocityTemplateGenerator(res.viewData);

    var computedMetaData = {
        title: req.pageMetaData.title,
        description: tpl(req.pageMetaData.description),
        keywords: req.pageMetaData.keywords,
        pageMetaTags: []
    };

    req.pageMetaData.pageMetaTags.forEach(function (item) {
        if (item.title) {
            computedMetaData.title = item.content;
        } else if (item.name && item.ID === 'description') {
            computedMetaData.description = tpl(item.content);
        } else if (item.name && item.ID === 'keywords') {
            computedMetaData.keywords = item.content;
        } else {
            computedMetaData.pageMetaTags.push(item);
        }
    });

    res.setViewData({
        CurrentPageMetaData: computedMetaData
    });

    next();
}

module.exports = {
    computedPageMetaData: computedPageMetaData
};
