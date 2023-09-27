/* global empty */

'use strict';

/**
 * models/idme.js
 * This model class provides a the controller an interface for consistently
 * passing data to the view with a defined format.
 */

function idme(args) {
    // SFCC API class imports
    var Site = require('dw/system/Site');

    // Get site pref values.
    var site = Site.getCurrent();

    var heroImage = site.getCustomPreferenceValue('IDmeButtonDataHero');
    var logo = site.getCustomPreferenceValue('IDmeButtonDataLogo');

    // Set instance var values.
    this.clientId = !empty(site.getCustomPreferenceValue('IDmeClientID')) ?
    site.getCustomPreferenceValue('IDmeClientID') : '';
    this.clientSecret = !empty(site.getCustomPreferenceValue('IDmeClientSecret')) ?
    site.getCustomPreferenceValue('IDmeClientSecret') : '';
    this.serviceEndpoint = !empty(site.getCustomPreferenceValue('IDmeServiceEndpoint')) ?
    site.getCustomPreferenceValue('IDmeServiceEndpoint') : '';
    this.buttonDataText = !empty(site.getCustomPreferenceValue('IDmeButtonDataText')) ?
    site.getCustomPreferenceValue('IDmeButtonDataText') : '';
    this.collapseTitle = !empty(site.getCustomPreferenceValue('IDmeButtonCollapseTitle')) ?
    site.getCustomPreferenceValue('IDmeButtonCollapseTitle') : '';
    this.heroImage = !empty(site.getCustomPreferenceValue('IDmeButtonDataHero')) ?
    heroImage.httpsURL : '';
    this.logo = !empty(site.getCustomPreferenceValue('IDmeButtonDataLogo')) ?
    logo.httpsURL : '';
    this.isIDmeButtonActive = !empty(site.getCustomPreferenceValue('IDmeButtonIsActive')) ?
    site.getCustomPreferenceValue('IDmeButtonIsActive') : false;
    this.scope = !empty(site.getCustomPreferenceValue('IDmeButtonScopes')) ?
    site.getCustomPreferenceValue('IDmeButtonScopes').join(',') : '';
}

module.exports = idme;
