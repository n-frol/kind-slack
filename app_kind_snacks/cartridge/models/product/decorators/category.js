'use strict';

var URLUtils = require('dw/web/URLUtils');

module.exports = function (object, category) {
    Object.defineProperty(object, 'category', {
        enumerable: true,
        writable: true,
        value: {}
    });
    Object.defineProperty(object.category, 'id', {
        enumerable: true,
        writable: true,
        value: category.ID
    });
    Object.defineProperty(object.category, 'pageUrl', {
        enumerable: true,
        writable: true,
        value: category.pageURL || URLUtils.url('Search-Show', 'cgid', category.ID)
    });
};
