'use strict';

var server = require('server');
server.extend(module.superModule);

var Site = require('dw/system/Site');

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

function isSMS(cookies) {
	if(empty(cookies)) {
		return false;
	}
	var autoShip = 0;
	for (var i = 0; i < cookies.getCookieCount(); i++) {
		var cookie = cookies[i];
		var cookieName = cookie.getName();
		if(cookieName == "og_reorder") {
			autoShip = Number(cookie.getValue());
			break;
		}
	}
	return Boolean(autoShip);
}

server.prepend('Login', function (req, res, next) {
	var viewData = res.getViewData();
	var autoShip = false;
	if (!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == true) {
		var cookies = request.getHttpCookies();
		autoShip = isAutoShip(cookies);
	}
	viewData.autoShip = autoShip;
    res.setViewData(viewData);
    return next();
});

server.prepend('Begin', function (req, res, next) {
	var viewData = res.getViewData();
	var autoShip = false;
	var forceSave = false;
	if (!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == true) {
		var cookies = request.getHttpCookies();
		autoShip = isAutoShip(cookies);
		forceSave = isSMS(cookies);
		if (autoShip && !customer.isAuthenticated()) {
			var URLUtils = require('dw/web/URLUtils');
            res.redirect(URLUtils.url('Checkout-Login'));
            next();
		}
	}
	viewData.autoShip = autoShip;
	viewData.forceSave = forceSave;
    res.setViewData(viewData);
    return next();
});

server.append('Begin', function (req, res, next) {
    var viewData = res.getViewData();
    var assets = require('*/cartridge/scripts/assets');
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
	var settings : Object = new Object();
	settings['page_type'] = "3";
	var cart : Object = new Object();		
	var products : Array = new Array();
	var count : Number = 0;
	var plis : Iterator = basket.getAllProductLineItems().iterator();
	while(plis.hasNext()) {
		var lineItem : Object = new Object();
		var pli : ProductLineItem = plis.next();
		if(pli.isOptionProductLineItem()) {
			continue;
		}
		lineItem['id'] = pli.getProductID();
		lineItem['quantity'] = pli.getQuantityValue();
		lineItem['unit_price'] = (pli.getProratedPrice().getValue()/pli.getQuantityValue()).toFixed(2);
		lineItem['total_price'] = pli.getProratedPrice().getValue().toFixed(2);			
		products[count] = lineItem;
		count++;
	}
	cart['products'] = products;
	cart['subtotal'] = basket.getAdjustedMerchandizeTotalPrice(false).getValue().toFixed(2);
	cart['shipping_total'] = basket.getShippingTotalPrice().getValue().toFixed(2);
	cart['tax_total'] = basket.getTotalTax().getValue().toFixed(2);
	cart['order_total'] = basket.getTotalGrossPrice().getValue().toFixed(2);
	settings['cart'] = cart;
	viewData.productSettings = JSON.stringify(settings);
	viewData.isConfirmStage = false;
    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
