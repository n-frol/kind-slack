/* eslint-disable */
'use strict';

var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
/**
 * Init for the experience picker custom editor
 *
 * Initialises the custom attribute editor with server side information such as URLs
 * @param {Object} editor - object representing a custom attribute editor
 */
module.exports.init = function (editor) {
    editor.configuration.put('clientid', request.httpHeaders.get('x-dw-client-id'));
    editor.configuration.put('siteid', Site.getCurrent().ID);
    editor.configuration.put('baseUrl',
     URLUtils.staticURL('experience/editors/creator/').https().toString());
};
