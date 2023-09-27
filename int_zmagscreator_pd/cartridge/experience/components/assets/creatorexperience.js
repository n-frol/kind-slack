'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');

/**
 * Render logic for Creator experience component
 * @param {dw.experience.ComponentScriptContext} context The component script context object.
 * @returns {string} The template to be displayed
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    if (content.experienceId) {
        model.experienceId = content.experienceId.experienceId;
    }

    return new Template('experience/components/assets/creatorexperience').render(model).text;
};
