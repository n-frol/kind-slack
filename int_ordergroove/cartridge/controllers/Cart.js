'use strict';

var server = require('server');
server.extend(module.superModule);

var assets = require('*/cartridge/scripts/assets');
var Site = require('dw/system/Site');
var BasketMgr = require('dw/order/BasketMgr');

server.append('Show', function (req, res, next) {
    var viewData = res.getViewData();
    var basket = BasketMgr.getCurrentOrNewBasket();
	var settings : Object = new Object();
	settings['page_type'] = "2";
	/*var frequencies : Object = new Object();
	var plis : Iterator = basket.getAllProductLineItems().iterator();
	while(plis.hasNext()) {
		var lineItem : Object = new Object();
		var pli : ProductLineItem = plis.next();
		if(pli.isOptionProductLineItem()) {
			continue;
		}
		var productID : String = pli.getProductID();
		var product : Product = pli.getProduct();
		if(empty(product.describe().getCustomAttributeDefinition('defaultFrequency'))) {
			break;
		}
		var frequency : String = !empty(product.getCustom().defaultFrequency.valueOf()) ? (product.getCustom().defaultFrequency.valueOf() + "_3") : "";
		if(!empty(frequency)) {
			frequencies[productID] = frequency;
		}
	}
	settings['default_frequency'] = frequencies;*/
	var cart : Object = new Object();
	var products : Array = new Array();
	var count : Number = 0;
	var plis : Iterator = basket.getAllProductLineItems().iterator();
	while(plis.hasNext()) {
		var lineItem : Object = new Object();
		var pli : ProductLineItem = plis.next();
		if(pli.isOptionProductLineItem() || (!empty(pli.custom.boxID) && pli.custom.isByobMaster !== true)) {
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
    res.setViewData(viewData);
    next();
});

server.append('GetProduct', function (req, res, next) {
    var viewData = res.getViewData();
    var Money = require('dw/value/Money');
    var StringUtils = require('dw/util/StringUtils');
    var pid = viewData.product.id;
    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(pid);
	var type = !empty(dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType')) ? dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType').getValue().toString() : "PERCENT";
	var amount = !empty(dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue')) ? dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue') : 0;
	var ogPrice = null;
	var spPrice = null;
	var salesPrice = Money(viewData.product.price.sales.decimalPrice, Site.getCurrent().getDefaultCurrency());
	if(type.toUpperCase() == 'PERCENT') {
		ogPrice = salesPrice.subtractPercent(amount).value;
	}
	else if(type.toUpperCase() == 'AMOUNT') {
		ogPrice = salesPrice.subtract(Money(amount, Site.getCurrent().getDefaultCurrency())).value;
	}
	else if(type.toUpperCase() == 'PRICEBOOK') {
		spPrice = product.getPriceModel().getPriceBookPrice("snack-pack-price-book").getValueOrNull();
		ogPrice = product.getPriceModel().getPriceBookPrice("kind-snacks-snack-club-prices").getValueOrNull();
	}
	spPrice = !empty(spPrice) ? StringUtils.formatMoney(Money(spPrice, Site.getCurrent().getDefaultCurrency())) : null;
	ogPrice = !empty(ogPrice) ? StringUtils.formatMoney(Money(ogPrice, Site.getCurrent().getDefaultCurrency())) : null;
	var autoShipEligible = false;
	if (!empty(product.describe().getCustomAttributeDefinition('autoShipEligible'))) {
		autoShipEligible = Boolean(product.getCustom()["autoShipEligible"]);
	}
	viewData.product.price.spPrice = spPrice;
	viewData.product.price.ogPrice = ogPrice;
	viewData.product.autoShipEligible = autoShipEligible;
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
