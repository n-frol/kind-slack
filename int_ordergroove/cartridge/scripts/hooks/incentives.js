/* eslint-disable */
'use strict';

/**
 * @module incentives.js
 *
 * This javascript file implements methods (via Common.js exports) that are needed by
 * the calculate.js script file.  This allows OCAPI calls to reference
 * these tools via the OCAPI 'hook' mechanism
 *
 */

var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
var Status = require('dw/system/Status');
var PercentageDiscount = require('dw/campaign/PercentageDiscount');
var AmountDiscount = require('dw/campaign/AmountDiscount');
var FixedPriceDiscount = require('dw/campaign/FixedPriceDiscount');
var FixedPriceShippingDiscount = require("dw/campaign/FixedPriceShippingDiscount");
var StringUtils = require("dw/util/StringUtils");
var Money = require("dw/value/Money");
var ArrayList = require("dw/util/ArrayList");
var collections = require('*/cartridge/scripts/util/collections');

var ogLog = Logger.getLogger('order-groove', 'OG');
var logPrefix = 'OrderGroove - hooks/incentives.js:';

/**
 * @function setOrderGroovePromos
 *
 * Function flags the line items of the basket to denote a promotion from OrderGroove.
 *
 * @param {object} basket	The basket containing the line items for promotions
 * @param {object} cookies	The cookies for the current request
 */
exports.setOrderGroovePromos = function (basket, cookies) {
	if(empty(Site.getCurrent().getCustomPreferenceValue('OrderGrooveEnable')) || Site.getCurrent().getCustomPreferenceValue('OrderGrooveEnable')==false) {
		return new Status(Status.OK);
	}
	if(empty(cookies)) {
		return new Status(Status.OK);
	}
	var autoShip = 0;
	var autoShipJSON = null;
	for (var i = 0; i < cookies.getCookieCount(); i++) {
		var cookie = cookies[i];
		var cookieName = cookie.getName();
		if(cookieName == "og_autoship") {
			autoShip = Number(cookie.getValue());
			ogLog.info(logPrefix + 'OrderGroove cookie found: og_autoship\n\t' +
				'Cookie value: ' + autoShip);
		}
		if(cookieName == "og_cart_autoship") {
			autoShipJSON = decodeURIComponent(cookie.getValue());
			ogLog.info(logPrefix + 'OrderGroove cookie found: og_cart_autoship\n\t' +
				'Cookie value: ' + autoShip);
		}
	}
	var isAutoShip = Boolean(autoShip);
	session.custom.snackClubOrder = isAutoShip;

	// reset custom shipping-level price adjustments
	var shipment : Shipment = basket.getDefaultShipment();
	var slis : Iterator = shipment.getShippingLineItems().iterator();
	if (basket.totalNetPrice.value !== 0) {
		while(slis.hasNext()) {
			var sli : ShippingLineItem = slis.next();
			var slipas : Iterator = sli.getShippingPriceAdjustments().iterator();
			while(slipas.hasNext()) {
				var slipa : PriceAdjustment = slipas.next();
				if(!empty(slipa) && slipa.isCustom()) {
					sli.removeShippingPriceAdjustment(slipa);
				}
			}
		}
		// apply shipping discount
		/*if(isAutoShip){
			var shippingMethodID : String = shipment.getShippingMethodID();
			if(!empty(shippingMethodID) && shippingMethodID == Site.getCurrent().getCustomPreferenceValue('OrderGrooveShippingMethod')) {
				var sli : ShippingLineItem = shipment.getStandardShippingLineItem();
				var fpsd : FixedPriceShippingDiscount = new FixedPriceShippingDiscount(0.00);
				var paFreeShipping : PriceAdjustment = sli.createShippingPriceAdjustment("og_kind_free_shipping", fpsd);
				paFreeShipping.setLineItemText("Free Shipping On Auto Delivery");
			}
		}*/

		// reset custom product-level price adjustments
		var plis : Iterator = basket.getAllProductLineItems().iterator();
		while(plis.hasNext()) {
				var pli : ProductLineItem = plis.next();
				if(pli.isOptionProductLineItem() || empty(session.custom.currentOGPromoID)) {
					continue;
				}
				var plipa : PriceAdjustment = pli.getPriceAdjustmentByPromotionID(session.custom.currentOGPromoID);
				if(!empty(plipa) && plipa.isCustom()) {
					pli.removePriceAdjustment(plipa);
				}
			}
		// apply product level price adjustments based on cookie
		if(!empty(autoShipJSON)) {
			var autoShipCart : Object = JSON.parse(autoShipJSON);
			var type : String = !empty(Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType')) ? Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountType').getValue().toString() : null;
			if (empty(type)) {
				return new Status(Status.OK);
			}
			var amount : Number = !empty(Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue')) ? Site.getCurrent().getCustomPreferenceValue('OrderGrooveDiscountValue') : 0;
			if(type.toUpperCase() == 'PERCENT') {
				var pd : PercentageDiscount = new PercentageDiscount(amount);
			}
			else if(type.toUpperCase() == 'AMOUNT') {
				var ad : AmountDiscount = new AmountDiscount(amount);
			}
			for (var j = 0; j < autoShipCart.length; j++) {
				var item = autoShipCart[j];
				var itemID : String = item['id'];
				var promoID : String = item['c'];
				if (empty(promoID)) {
					return new Status(Status.OK);
				}
				session.custom.currentOGPromoID = promoID;
				var plis : Iterator = basket.getAllProductLineItems(itemID).iterator();
				while(plis.hasNext()) {
					var pli : ProductLineItem = plis.next();
					if(pli.isOptionProductLineItem()) {
						continue;
					}
					var productID : String = pli.getProductID();
					var plipa : PriceAdjustment = pli.getPriceAdjustmentByPromotionID(promoID);
					var lineItemText = '';
					if (empty(plipa)) {
						if (type.toUpperCase() == 'PERCENT') {
							var paPercent : PriceAdjustment = pli.createPriceAdjustment(promoID, pd);
							lineItemText = amount.toPrecision().toString() + '% Off Auto Delivery';
							paPercent.setLineItemText(lineItemText);

							// Log the new PA
							ogLog.info(
								logPrefix +
								'OG Percentage price adjustment created\n\t' +
								'Promotion ID: {0}\n\t' +
								'Discount Applied: {1}',
								promoID,
								lineItemText
							);
						}
						else if (type.toUpperCase() == 'AMOUNT') {
							var paAmount : PriceAdjustment = pli.createPriceAdjustment(promoID, ad);
							var amountMoney : String  = StringUtils.formatMoney(new Money(amount, basket.getCurrencyCode()));
							lineItemText = amountMoney + ' Off Auto Delivery';
							paAmount.setLineItemText(lineItemText);

							// Log the new PA
							ogLog.info(
								logPrefix +
								'OG Amount price adjustment created\n\t' +
								'Promotion ID: {0}\n\t' +
								'Discount Applied: {1}',
								promoID,
								lineItemText
							);
						}
						else if (type.toUpperCase() == 'PRICEBOOK') {
							var isSnackPackPriceBook = false;

							var amount : Number = pli.getProduct().getPriceModel().getPriceBookPrice("snack-pack-price-book").getValueOrNull();
							// if the flag hasn't been set to remove the promotional pricing and there's a pricbook entry,
							// use that.
							if (!session.custom.removeSnackPackPromotionalPricing && !empty(amount)) {
								isSnackPackPriceBook = true;
							} else {
								// otherwise, fall back on the the regular snack club price
								amount = pli.getProduct().getPriceModel().getPriceBookPrice("kind-snacks-snack-club-prices").getValueOrNull();
							}
							amount = !empty(amount) ? amount : 0;

							var fpd : FixedPriceDiscount = new FixedPriceDiscount(amount);
							var paFixed : PriceAdjustment = pli.createPriceAdjustment(promoID, fpd);
							lineItemText = 'Snack Club Price';
							if (isSnackPackPriceBook) {
								paFixed.custom.isSnackPackPromotionalPricing = true;
							}

							// Log the new PA
							ogLog.info(
								logPrefix +
								'OG Fixed price adjustment created\n\t' +
								'Promotion ID: {0}\n\t' +
								'Discount Applied: {1}',
								promoID,
								lineItemText
							);
							paFixed.setLineItemText(lineItemText);
						}
					}
					break;
				}
			}

		}
	}
	return new Status(Status.OK);
};

/**
 * @function setOrderGrooveExclusivity
 *
 * Function prevents promotion stacking from the promotion manager when an OrderGroove promotion is present
 * at the product level.
 *
 * @param {object} basket	The basket containing the line items for promotions
 * @param {object} cookies	The cookies for the current request
 */
exports.setOrderGrooveExclusivity = function (basket, cookies) {
	var autoShipJSON = null;
	var isRecurringOrder = basket.channelType !== null ? basket.channelType.value === basket.CHANNEL_TYPE_SUBSCRIPTIONS : false;
    var isClubOrder = session.custom.snackClubOrder;
	for (var i = 0; i < cookies.getCookieCount(); i++) {
		var cookie = cookies[i];
		var cookieName = cookie.getName();
		if(cookieName == "og_cart_autoship") {
			autoShipJSON = decodeURIComponent(cookie.getValue());
		}
	}
	var autoShipCart : Object = JSON.parse(autoShipJSON);
    var items = new ArrayList();
    if(!empty(autoShipCart)) {
        for (var j = 0; j < autoShipCart.length; j++) {
            var item = autoShipCart[j];
            items.add(item['id'].toString());
        }
    }

    removePriceAdjustment(basket, isRecurringOrder, isClubOrder); // Order Level discounts
    removeShippingPriceAdjustments(basket, isRecurringOrder, isClubOrder); // All shipping adjustment
    var plis : Iterator = basket.getAllProductLineItems().iterator();

    while(plis.hasNext()) {
        var pli : ProductLineItem = plis.next();
        var productID : String = pli.getProductID();
        var plipa : Iterator = pli.getPriceAdjustments().iterator();
        while(plipa.hasNext()) {
            var adjustment : PriceAdjustment = plipa.next();
            var promotion : Promotion = adjustment.getPromotion();
            if (!empty(promotion)) {
                var isDiscountInclusionSelected = Object.hasOwnProperty.call(promotion.getCustom(), 'orderGrooveDiscountInclusion');
                var isLegacyOrderGrooveInclusionSelected = promotion.getCustom()["OrderGrooveInclusion"];
                if(!isDiscountInclusionSelected){
                    /**
                     * Legacy select box options. If it's not selected remove the discount from CLB items.
                     */
                    if( isLegacyOrderGrooveInclusionSelected === false && items.contains(productID) && isDiscountInclusionSelected === false) {
                        pli.removePriceAdjustment(adjustment);
                        continue;
                    }
                    if(isLegacyOrderGrooveInclusionSelected === false && isRecurringOrder) {
                        pli.removePriceAdjustment(adjustment);
                        continue;
                    }
                    continue;
                } else {

                    /**
                     * the ability to configure a promotion to be isolated to the only the following product types OR
                     * any specified combination of the following product types:
                     * Ad hoc
                     * Storefront subscription
                     * Recurring subscription
                     */
                    var selectedInclusions = promotion.getCustom()["orderGrooveDiscountInclusion"];
                    var discountInclusion = getDiscountInclusion(selectedInclusions);

                    if (discountInclusion.isAdHocSelected && discountInclusion.isClubSelected & discountInclusion.isRecurringSelected) {
                        continue;
                    }

                    if (discountInclusion.isAdHocSelected && discountInclusion.isClubSelected === false && items.contains(productID)) {
                        pli.removePriceAdjustment(adjustment);
                        continue;
                    }

                    /**
                     * Following code added for front-end bonus item. When selected clb discount inclusion
                     *  the promotion item sku is not in the recurring order cookie and removes the
                     *  promotion from line item. We need to find promotion item sku and validated it
                     *  if the promotion item is in loop.
                     */
                    if(pli.bonusProductLineItem && discountInclusion.isClubSelected) {
                        var productLineItems = pli.getLineItemCtnr().getProductLineItems();
                        collections.forEach(productLineItems, function (lineItem) {
                            if(!lineItem.bonusProductLineItem && items.contains(lineItem.getProductID())) {
                                productID = lineItem.getProductID();
                            }
                        })
                    }

                    if (discountInclusion.isAdHocSelected == false && discountInclusion.isClubSelected === true && items.contains(productID) === false && !isRecurringOrder) {
                        pli.removePriceAdjustment(adjustment);
                        continue;
                    }
                    if (discountInclusion.isAdHocSelected == false && discountInclusion.isClubSelected === false && discountInclusion.isRecurringSelected && !isRecurringOrder) {
                        pli.removePriceAdjustment(adjustment);
                        continue;
                    }
                    if(isRecurringOrder){
                        if(!discountInclusion.isRecurringSelected){
                            pli.removePriceAdjustment(adjustment);
                            continue;
                        }
                    }
                }
            }
        }
    }
	return new Status(Status.OK);
};

/**
 * @function removeShippingPriceAdjustments
 *
 * @param { dw.order.Basket } basket
 * @param { boolean } isRecurringOrder
 * @param { boolean } isClubOrder
 */
function removeShippingPriceAdjustments(basket,  isRecurringOrder, isClubOrder) {
    var priceAdjustment = basket.getAllShippingPriceAdjustments().iterator(); // Order Level discounts
    while (priceAdjustment.hasNext()) {
        var adjustment  = priceAdjustment.next();
        var promotion  = adjustment.getPromotion();
        var safeToRemovePromotion = removePromotion(promotion, isRecurringOrder, isClubOrder);
        if(safeToRemovePromotion) {
            basket.removeShippingPriceAdjustment(adjustment);
        }
    }
}

/**
 * @function removePriceAdjustment
 *
 * @param { dw.order.Basket } basket
 * @param { boolean } isRecurringOrder
 * @param { boolean } isClubOrder
 */
function removePriceAdjustment(basket,  isRecurringOrder, isClubOrder) {
    var priceAdjustment = basket.getPriceAdjustments().iterator(); // Order Level discounts
    while (priceAdjustment.hasNext()) {
        var adjustment  = priceAdjustment.next();
        var promotion  = adjustment.getPromotion();
        var safeToRemovePromotion = removePromotion(promotion, isRecurringOrder, isClubOrder);
        if(safeToRemovePromotion) {
            basket.removePriceAdjustment(adjustment);
        }
    }
}

/**
 * @function removePromotion
 *
 * @param { dw.campaign.Promotion } promotion The promotion associated with this price adjustment.
 * @returns boolean
 */
function removePromotion(promotion, isRecurringOrder, isClubOrder) {
    if (!empty(promotion)) {
        var isDiscountInclusionSelected = Object.hasOwnProperty.call(promotion.getCustom(), 'orderGrooveDiscountInclusion');
        if (isDiscountInclusionSelected) {
            var selectedInclusions = promotion.getCustom()["orderGrooveDiscountInclusion"];
            var discountInclusion = getDiscountInclusion(selectedInclusions)

            if(!isClubOrder && !isRecurringOrder && discountInclusion.isAdHocSelected){
                return false;
            }

            if(isClubOrder && !isRecurringOrder && discountInclusion.isClubSelected) {
                return false;
            }

            if(!isClubOrder && isRecurringOrder && discountInclusion.isRecurringSelected){
                return false;
            }
            return true;
        }
    }
    return false;
}

/**
 * @function getDiscountInclusion
 *
 * @param { Array<dw.value.EnumValue> } selectedInclusions
 * @returns {{isAdHocSelected: boolean, isClubSelected: boolean, isRecurringSelected: boolean}}
 */
function getDiscountInclusion(selectedInclusions) {
    var selectedInclusions = selectedInclusions.map(function (item) { return item.value; });
    return {
        isAdHocSelected:    selectedInclusions.indexOf('adh') < 0 ? false : true,
        isClubSelected:     selectedInclusions.indexOf('clb') < 0 ? false : true,
        isRecurringSelected:selectedInclusions.indexOf('recurring') < 0 ? false : true
    };
}
