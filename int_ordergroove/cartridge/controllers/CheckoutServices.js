'use strict';

var server = require('server');
server.extend(module.superModule);

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

server.prepend('PlaceOrder', function (req, res, next) {
	var viewData = res.getViewData();
	var autoShip = false;
	var Site = require('dw/system/Site');
	if (!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == true) {
		var cookies = request.getHttpCookies();
		autoShip = isAutoShip(cookies);
		if (autoShip && !customer.isAuthenticated()) {
			var URLUtils = require('dw/web/URLUtils');
            res.redirect(URLUtils.url('Checkout-Login'));
            return next();
		}
	}
	viewData.autoShip = autoShip;
    res.setViewData(viewData);
    return next();
});

server.append('PlaceOrder', function (req, res, next) {
	var viewData = res.getViewData();
	if (viewData.error !== true) {
		var response = require('int_ordergroove/cartridge/scripts/purchasePost').orderNo(viewData.orderID, false, viewData.autoShip);
	}
    return next();
});

module.exports = server.exports();
