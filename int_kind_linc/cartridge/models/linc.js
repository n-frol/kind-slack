/* global empty */

'use strict';

/**
 * models/linc.js
 * This model class provides a the controller an interface for consistently
 * passing data to the view with a defined format.
 */

function linc(args) {
    // SFCC API class imports
    var Site = require('dw/system/Site');

    // Get site pref values.
    var site = Site.getCurrent();

    // Set instance var values.
    this.clientSecret = !empty(site.getCustomPreferenceValue('lincClientSecret')) ?
        site.getCustomPreferenceValue('lincClientSecret') : '';
    this.serviceEndpoint = !empty(site.getCustomPreferenceValue('lincServiceEndpoint')) ?
        site.getCustomPreferenceValue('lincServiceEndpoint') : '';
    this.publicId = !empty(site.getCustomPreferenceValue('lincClientShopId')) ?
        site.getCustomPreferenceValue('lincClientShopId') : '';
    this.isDevEnable = !empty(site.getCustomPreferenceValue('lincEnableDev')) ?
        site.getCustomPreferenceValue('lincEnableDev') : true;
}

module.exports = linc;
