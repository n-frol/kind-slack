'use strict';

/* eslint-disable */
function setOrderPromotion(order) {
    var priceAdjutsments = order.priceAdjustments;
    if (priceAdjutsments.empty) {
        return;
    }
    var iterator = priceAdjutsments.iterator();
    var priceAdjustmentArray = [];
    var priceAdjutsment;

    while (iterator.hasNext()) {
        priceAdjutsment = iterator.next();
        var campaignID = !empty(priceAdjutsment.campaignID)
            ? priceAdjutsment.campaignID
            : '';
        var couponCode = '';
        if (
            !empty(priceAdjutsment.couponLineItem) &&
            priceAdjutsment.couponLineItem.applied
        ) {
            couponCode = priceAdjutsment.couponLineItem.couponCode;
        }

        var proratePricesMap = priceAdjutsment.getProratedPrices();
        var prodItemKeys = proratePricesMap.keySet();
        var proratedPrice;

        for (var i = 0; i < prodItemKeys.length; i++) {
            var productItem = prodItemKeys[i];
            var obj = {};
            proratedPrice = Math.abs(proratePricesMap.get(productItem).value);
            obj.pid = productItem.productID;
            obj.unitDiscountAmount = proratedPrice / productItem.quantity.value;
            // this would in most cases be 0. This would account for trailing decimals.
            obj.remainderDiscountAmount =
                proratedPrice -
                obj.unitDiscountAmount * productItem.quantity.value;
            obj.quantity = productItem.quantity.value;
            obj.campaignId = campaignID;
            obj.promotionId = priceAdjutsment.promotion.ID;
            obj.couponId = couponCode;
            obj.position = productItem.position;
            priceAdjustmentArray.push(obj);
        }
    }
    
    return JSON.stringify(priceAdjustmentArray);

}

module.exports = {
    setOrderPromotion: setOrderPromotion
}
/* eslint-enable */
