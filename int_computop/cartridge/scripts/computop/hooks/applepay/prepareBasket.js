'use strict';
var Logger = require('dw/system/Logger');
var ApplePayHookResult = require('dw/extensions/applepay/ApplePayHookResult');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
/* Script includes */

function isAutoShip(cookies) {
	if(empty(cookies)) {
		return false;
	}
	var autoShip = 0;
	for (var i = 0; i < cookies.getCookieCount(); i++) {
		var cookie = cookies[i];
		var cookieName = cookie.getName();
		if(cookieName == "og_autoship") {
			autoShip = Number(cookie.getValue());
			break;
		}
	}
	return Boolean(autoShip);
}


exports.prepareBasket = function (basket, parameters) {

    if (!empty(basket)) {
        Transaction.wrap(function () {
            basket.setChannelType(basket.CHANNEL_TYPE_STOREFRONT);
        });
    }
	var autoShip = false;
	var Site = require('dw/system/Site');
	if (!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == true) {
		var cookies = request.getHttpCookies();
        autoShip = isAutoShip(cookies);
		if (autoShip && !customer.isAuthenticated()) {
            var URLUtils  = require('dw/web/URLUtils');
			var returnUrl =  URLUtils.url('Cart-Show');
            var url = URLUtils.url('Login-Show', 'action', 'register', 'lrforwardurl' , returnUrl );
            return new ApplePayHookResult(new Status(Status.ERROR),url)
		}
	}    
   

};