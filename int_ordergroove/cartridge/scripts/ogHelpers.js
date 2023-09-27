'use strict';

var Money = require('dw/value/Money');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');


/**
 * Adds necessary pricing data to product-related views
 * @param {object} viewData - view to add OG-related data to
 */
function setProductValues(viewData) {
    var pid = viewData.product.id;
    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(pid);
    var settings : Object = new Object();
    if(!empty(product)) {
        settings['page_type'] = "1";
        settings['logged_in'] = customer.isAuthenticated();
        if(!empty(product.describe().getCustomAttributeDefinition('impulseUpsell'))) {
            // OG cannot accept an array of values for variant impulse upsells
            if(product.isMaster() && !product.custom.isByobMaster) {
                settings['impulse_upsell'] = true;
            }
            else {
                var productID : String = product.getID();
                var upsell : String = !empty(product.getCustom().impulseUpsell) ? (product.getCustom().impulseUpsell.valueOf()) : false;
                settings['impulse_upsell'] = upsell;
            }
        }
    }
    viewData.productSettings = JSON.stringify(settings);

    var type = !empty(dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType')) ? dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType').getValue().toString() : "PRICEBOOK";
    var amount = !empty(dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue')) ? dw.system.Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue') : 0;
    var ogPrice = {};
    var spPrice = {};

    if (!empty(viewData.product.price) && !empty(viewData.product.price.sales) && !empty(viewData.product.price.sales.decimalPrice)) {
        var salesPrice = Money(viewData.product.price.sales.decimalPrice, Site.getCurrent().getDefaultCurrency());
        if(type.toUpperCase() == 'PERCENT') {
            ogPrice.value = salesPrice.subtractPercent(amount).value;
        }
        else if(type.toUpperCase() == 'AMOUNT') {
            ogPrice.value = salesPrice.subtract(Money(amount, Site.getCurrent().getDefaultCurrency())).value;
        }
        else if(type.toUpperCase() == 'PRICEBOOK') {
            spPrice.value = product.getPriceModel().getPriceBookPrice("snack-pack-price-book").getValueOrNull();
            ogPrice.value = product.getPriceModel().getPriceBookPrice("kind-snacks-snack-club-prices").getValueOrNull();
        }
        spPrice.formatted = !empty(spPrice.value) ? StringUtils.formatMoney(Money(spPrice.value, Site.getCurrent().getDefaultCurrency())) : null;
        ogPrice.formatted = !empty(ogPrice.value) ? StringUtils.formatMoney(Money(ogPrice.value, Site.getCurrent().getDefaultCurrency())) : null;
    }

    var autoShipEligible = false;
    if (!empty(product.describe().getCustomAttributeDefinition('autoShipEligible'))) {
        autoShipEligible = Boolean(product.getCustom()["autoShipEligible"]);
    }
    viewData.product.price.spPrice = spPrice;
    viewData.product.price.ogPrice = ogPrice;
    viewData.product.autoShipEligible = autoShipEligible;
}

module.exports = {
    setProductValues: setProductValues
}
