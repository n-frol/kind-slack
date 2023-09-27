/* global empty */
'use strict';

var base = module.superModule;

var money = require('dw/value/Money');


/**
 * Get a product's promotional price
 *
 * @param {dw.catalog.Product} product - Product under evaluation
 * @param {dw.util.Collection.<dw.campaign.Promotion>} promotions - Promotions that apply to this
 *     product
 * @param {dw.catalog.ProductOptionModel} currentOptionModel - The product's option model
 * @return {dw.value.Money} - Promotional price
 */
function getPromotionPrice(product, promotions, currentOptionModel) {
    var PROMOTION_CLASS_PRODUCT = require('dw/campaign/Promotion').PROMOTION_CLASS_PRODUCT;

    var lowestPrice;
    var promotionIter = promotions.iterator();
    while (promotionIter.hasNext()) {
        var curPromotion = promotionIter.next();
        var isAdhPromotion = false;
        var isDiscountInclusionSelected = Object.hasOwnProperty.call(curPromotion.getCustom(), 'orderGrooveDiscountInclusion');
        if (isDiscountInclusionSelected) {
            var inclusions = curPromotion.getCustom().orderGrooveDiscountInclusion.map(function (item) { return item.value; });
            isAdhPromotion = inclusions.indexOf('adh') >= 0;
        }
        if (isAdhPromotion) {
            var tempPrice = currentOptionModel
                ? curPromotion.getPromotionalPrice(product, currentOptionModel)
                : curPromotion.getPromotionalPrice(product, product.optionModel);
            if (curPromotion.promotionClass && curPromotion.promotionClass.equals(PROMOTION_CLASS_PRODUCT) && tempPrice.available && (empty(lowestPrice) || (tempPrice.value < lowestPrice.value))) {
                lowestPrice = tempPrice;
            }
        }
    }

    return lowestPrice || money.NOT_AVAILABLE;
}


module.exports = {
    getHtmlContext: base.getHtmlContext,
    getRootPriceBook: base.getRootPriceBook,
    renderHtml: base.renderHtml,
    getPromotionPrice: getPromotionPrice
};
