'use strict';

var base = module.superModule;

var formatMoney = require('dw/util/StringUtils').formatMoney;
var collections = require('*/cartridge/scripts/util/collections');

var Resource = require('dw/web/Resource');
var PromotionMgr = require('dw/campaign/PromotionMgr');

/**
 * Generates an object of approaching discounts
 * @param {dw.order.Basket} basket - Current users's basket
 * @param {dw.campaign.DiscountPlan} discountPlan - set of applicable discounts
 * @returns {Object} an object of approaching discounts
 */
function getApproachingDiscounts(basket, discountPlan) {
    var approachingOrderDiscounts;
    var approachingShippingDiscounts;
    var orderDiscountObject;
    var shippingDiscountObject;
    var discountObject;

    if (basket && basket.productLineItems) {
        // TODO: Account for giftCertificateLineItems once gift certificates are implemented
        approachingOrderDiscounts = discountPlan.getApproachingOrderDiscounts();
        approachingShippingDiscounts =
            discountPlan.getApproachingShippingDiscounts(basket.defaultShipment);

        orderDiscountObject =
            collections.map(approachingOrderDiscounts, function (approachingOrderDiscount) {
                var merchandiseTotal = approachingOrderDiscount.getMerchandiseTotal().getValue();
                var conditionThreshold = approachingOrderDiscount.getConditionThreshold().getValue();
                var completeStatus = (merchandiseTotal / conditionThreshold) * 100;

                return {
                    completeStatus: completeStatus,
                    discountMsg: '<div class="c-approaching-discounts__title text-left">'
                        + Resource.msgf(
                            'msg.approachingpromo',
                            'cart',
                            null,
                            formatMoney(
                                approachingOrderDiscount.getDistanceFromConditionThreshold()
                            ),
                            approachingOrderDiscount.getDiscount()
                                .getPromotion().getCalloutMsg()
                        )
                    + '</div></div>'
                    + '<div class="c-approaching-discounts__bar-outer">'
                        + '<div class="c-approaching-discounts__bar-inner" '
                        + 'style="width: ' + completeStatus + '%;">'
                    + '</div>'
                };
            });

        shippingDiscountObject =
            collections.map(approachingShippingDiscounts, function (approachingShippingDiscount) {
                var merchandiseTotal = approachingShippingDiscount.getMerchandiseTotal().getValue();
                var conditionThreshold = approachingShippingDiscount.getConditionThreshold().getValue();
                var completeStatus = (merchandiseTotal / conditionThreshold) * 100;

                return {
                    completeStatus: completeStatus,
                    discountMsg: '<div class="c-approaching-discounts__title text-left">'
                        + Resource.msgf(
                            'msg.approachingpromo',
                            'cart',
                            null,
                            formatMoney(
                                approachingShippingDiscount.getDistanceFromConditionThreshold()
                            ),
                            approachingShippingDiscount.getDiscount()
                                .getPromotion().getCalloutMsg()
                        )
                    + '</div></div>'
                    + '<div class="c-approaching-discounts__bar-outer">'
                        + '<div class="c-approaching-discounts__bar-inner" '
                        + 'style="width: ' + completeStatus + '%;">'
                    + '</div>'
                };
            });
        discountObject = orderDiscountObject.concat(shippingDiscountObject);
    }
    return discountObject;
}

/**
 * @constructor
 * @classdesc CartModel class that represents the current basket
 *
 * @param {dw.order.Basket} basket - Current users's basket
 * @param {dw.campaign.DiscountPlan} discountPlan - set of applicable discounts
 */
function CartModel(basket) {
    base.apply(this, [basket]);

    if (basket !== null) {
        // Update approachingDiscounts with our version of geApproachingDiscounts
        var discountPlan = PromotionMgr.getDiscounts(basket);
        if (discountPlan) {
            this.approachingDiscounts = getApproachingDiscounts(basket, discountPlan);
        }
    }
}

module.exports = CartModel;
