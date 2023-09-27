'use strict';

var HashMap = require('dw/util/HashMap');
var Template = require('dw/util/Template');
var money = require('dw/value/Money');
var collections = require('*/cartridge/scripts/util/collections');

/**
 * Return root price book for a given price book
 * @param {dw.catalog.PriceBook} priceBook - Provided price book
 * @returns {dw.catalog.PriceBook} root price book
 */
function getRootPriceBook(priceBook) {
    var rootPriceBook = priceBook;
    while (rootPriceBook.parentPriceBook) {
        rootPriceBook = rootPriceBook.parentPriceBook;
    }
    return rootPriceBook;
}


/**
 * Return  clb price book id
 * @returns {string}  clb price book id
 */
function getPriceBookId() {
    return 'kind-snacks-snack-club-prices';
}

/**
 * Return  BYOB clb price book id
 * @returns {string}  clb price book id
 */
function getByobPriceBookId() {
    return 'snack-pack-price-book ';
}

/**
 * Creates a HashMap input object for dw.util.Template.render(HashMap)
 * @param {Object} keyMap - Key-value pairs object
 * @return {dw.util.HashMap} - HashMap from key-value pairs
 */
function getHtmlContext(keyMap) {
    var context = new HashMap();
    Object.keys(keyMap).forEach(function (key) {
        context.put(key, keyMap[key]);
    });
    return context;
}

/**
 * Get a product's promotional clb price
 *
 * @param {dw.catalog.Product} product - Product under evaluation
 * @param {dw.util.Collection.<dw.campaign.Promotion>} promotions - Promotions that apply to this
 *     product
 * @param {dw.value.Money} listPrice - List price
 * @return {dw.value.Money} - Promotional clb price
 */
function getPromotionPrice(product, promotions, listPrice) {
    var PROMOTION_CLASS_PRODUCT = require('dw/campaign/Promotion').PROMOTION_CLASS_PRODUCT;
    var price = money.NOT_AVAILABLE;
    var promotion = collections.find(promotions, function (promo) {
        var isClubPromotion = false;
        var isDiscountInclusionSelected = Object.hasOwnProperty.call(promo.getCustom(), 'orderGrooveDiscountInclusion');
        if (isDiscountInclusionSelected) {
            var inclusions = promo.getCustom().orderGrooveDiscountInclusion.map(function (item) { return item.value; });
            isClubPromotion = inclusions.indexOf('clb') >= 0;
        }
        return isClubPromotion && promo.promotionClass && promo.promotionClass.equals(PROMOTION_CLASS_PRODUCT);
    });

    if (promotion) {
        var isPromotionDiscountPropertyExist = Object.hasOwnProperty.call(promotion.getCustom(), 'clbItemPromotionDiscount');
        var isPromotionDiscountTypePropertyExist = Object.hasOwnProperty.call(promotion.getCustom(), 'clbItemPromotionDiscountType');
        if (isPromotionDiscountPropertyExist && isPromotionDiscountTypePropertyExist) {
            var clbItemPromotionDiscount = promotion.custom.clbItemPromotionDiscount;
            var clbItemPromotionDiscountType = promotion.custom.clbItemPromotionDiscountType; // dw.value.EnumValue
            var discountType = clbItemPromotionDiscountType.value.toString();

            // eslint-disable-next-line default-case
            switch (discountType) {
                case 'AMOUNT':
                    // eslint-disable-next-line new-cap
                    var amount = new money(clbItemPromotionDiscount, listPrice.currencyCode);
                    price = listPrice.subtract(amount);
                    break;
                case 'PERCENTAGE':
                    price = listPrice.subtractPercent(clbItemPromotionDiscount);
                    break;
                case 'FIXED_PRICE':
                    // eslint-disable-next-line new-cap
                    var fixPrice = new money(clbItemPromotionDiscount, listPrice.currencyCode);
                    price = fixPrice;
                    break;
            }
        }
    }

    return price;
}

/**
 * Render Template HTML
 *
 * @param {dw.util.HashMap} context - Context object that will fill template placeholders
 * @param {string} [templatePath] - Optional template path to override default
 * @return {string} - Rendered HTML
 */
function renderHtml(context, templatePath) {
    var html;
    var path = templatePath || 'product/components/pricing/ajaxMain.isml';
    var tmpl = new Template(path);
    html = tmpl.render(context);

    return html.text;
}

module.exports = {
    getHtmlContext: getHtmlContext,
    getPriceBookId: getPriceBookId,
    getByobPriceBookId: getByobPriceBookId,
    getRootPriceBook: getRootPriceBook,
    renderHtml: renderHtml,
    getPromotionPrice: getPromotionPrice
};
