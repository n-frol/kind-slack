/* global empty */

'use strict';
const KlaviyoSubscriptionUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');

function subscribeToList(args) {
    return KlaviyoSubscriptionUtils.newSubscribeToList(args);

}

module.exports = {
    subscribeToList:subscribeToList
};
