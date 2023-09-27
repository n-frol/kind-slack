'use strict';

var Site = require('dw/system/Site');
var ApplePayHookResult = require('dw/extensions/applepay/ApplePayHookResult');
var Status = require('dw/system/Status');

exports.getRequest = function (basket, req) {
    var autoShip = false;
    let stat;
    let result;
    if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveSession")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveSession") == true) {
        var cookies  = request.getHttpCookies();
        // eslint-disable-next-line
        for each (var cookie in cookies) {
            var cookieName = cookie.getName();
            if(cookieName == "og_autoship") {
                autoShip = Boolean(Number(cookie.getValue()));
                break;
            }
        }

    }
    if (autoShip === false) {
        session.custom.applepaysession = 'yes';
        stat = new Status(Status.OK);
        result = new ApplePayHookResult(stat,null);
        // FR - Always return a status so that checkoutButtons.isml can be driven by the ApplePayHookResult
    }else {
        session.custom.applepaysession = 'no';
        stat = new Status(Status.ERROR);
        result = new ApplePayHookResult(stat,null);
        // FR - need to return a result to consistently not show the apple pay button in this case
        return result;
    }
};
