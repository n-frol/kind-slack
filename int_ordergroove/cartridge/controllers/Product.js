'use strict';

var server = require('server');
server.extend(module.superModule);

var assets = require('*/cartridge/scripts/assets');
var Site = require('dw/system/Site');
var Money = require('dw/value/Money');
var StringUtils = require('dw/util/StringUtils');


var ogHelpers = require('int_ordergroove/cartridge/scripts/ogHelpers');

/**
 * Addon function that can be called by both Product-Show and Product-ShowInCategory
 */
function pdpAddon(req, res, next) {
    var viewData = res.getViewData();
    ogHelpers.setProductValues(viewData);
    res.setViewData(viewData);

    next();
}

server.append('Show', pdpAddon);
server.append('ShowInCategory', pdpAddon);
server.append('AddToCart', pdpAddon);

server.append('ShowQuickView', function (req, res, next) {
    var viewData = res.getViewData();
    var pid = viewData.product.id;
    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(pid);
	var type = !empty(dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType')) ? dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType').getValue().toString() : "PRICEBOOK";
	var amount = !empty(dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue')) ? dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue') : 0;
	var ogPrice = null;
	var spPrice = null;
	if (!empty(viewData.product.price) && !empty(viewData.product.price.sales) && !empty(viewData.product.price.sales.decimalPrice)) {
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
	}

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
