'use strict';
var Site = require('dw/system/Site');
var YotpoLoyalty = require('*/cartridge/scripts/service/yotpoLoyaltyService');


function newsletter(arg) {
    let actionName = Site.getCurrent().getCustomPreferenceValue("yotpoLoyaltyNewsletterActionName");
    let email = arg;
    let body = {
        type: "CustomAction",
        customer_email: email,
        action_name: actionName
    };
    let response = YotpoLoyalty.newsLetterSignUp(body);
    return response;
}

module.exports = {
    newsletter: newsletter
};
