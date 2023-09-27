/* global empty */

'use strict';

/**
 * @constructor
 * @classdesc The yotpo loyalty model
 */
function Loyalty() {
    // SFCC API class imports
    let Site = require('dw/system/Site');

    // Get site pref values.
    let site = Site.getCurrent();
    this.serviceEndpoint = !empty(site.getCustomPreferenceValue('yotpoLoyaltyEndPointUrl')) ?
        site.getCustomPreferenceValue('yotpoLoyaltyEndPointUrl') : '';
    this.xguid = !empty(site.getCustomPreferenceValue('yotpoLoyaltyXguid')) ?
        site.getCustomPreferenceValue('yotpoLoyaltyXguid') : '';
    this.xapikey = !empty(site.getCustomPreferenceValue('yotpoLoyaltyApiKey')) ?
        site.getCustomPreferenceValue('yotpoLoyaltyApiKey') : '';
}

module.exports = Loyalty;
