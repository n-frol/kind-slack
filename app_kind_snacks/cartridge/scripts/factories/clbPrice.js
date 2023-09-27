'use strict';

var money = require('dw/value/Money');
var priceHelper = require('*/cartridge/scripts/helpers/clbPricing');
var ClbPrice = require('*/cartridge/models/price/clb');
var ByobPrice = require('*/cartridge/models/price/byob');


/**
 * Get list price for a product
 *
 * @param {dw.catalog.ProductPriceModel} priceModel - Product price model
 * @return {dw.value.Money} - List price
 */
function getListPrice(priceModel) {
    var price = money.NOT_AVAILABLE;
    var priceBook;
    var priceBookPrice;

    if (priceModel.price.valueOrNull === null && priceModel.minPrice) {
        return priceModel.minPrice;
    }

    priceBook = priceHelper.getRootPriceBook(priceModel.priceInfo.priceBook);
    priceBookPrice = priceModel.getPriceBookPrice(priceBook.ID);

    if (priceBookPrice.available) {
        return priceBookPrice;
    }

    price = priceModel.price.available ? priceModel.price : priceModel.minPrice;

    return price;
}

/**
 * Retrieves Clb rice instance
 *
 * @param {dw.catalog.Product|dw.catalog.productSearchHit} inputProduct - API object for a product
 * @param {string} currency - Current session currencyCode
 * @param {boolean} useSimplePrice - Flag as to whether a simple price should be used, used for
 *     product tiles and cart line items.
 * @param {dw.util.Collection<dw.campaign.Promotion>} promotions - Promotions that apply to this
 *                                                                 product
 * @param {dw.catalog.ProductOptionModel} currentOptionModel - The product's option model
 * @return {TieredPrice|RangePrice|DefaultPrice} - The product's Clb price
 */
function getPrice(inputProduct, currency, useSimplePrice, promotions, currentOptionModel) {
    var salesPrice;
    var listPrice;
    var product = inputProduct;
    var promotionPrice = money.NOT_AVAILABLE;
    var priceModel = currentOptionModel
        ? product.getPriceModel(currentOptionModel)
        : product.getPriceModel();


    // DEFAULT
    if ((product.master || product.variationGroup) && product.variationModel.variants.length > 0) {
        product = product.variationModel.variants[0];
        priceModel = product.priceModel;
    }

    var priceBookId = priceHelper.getPriceBookId();
    listPrice = getListPrice(priceModel);
    salesPrice = priceModel.getPriceBookPrice(priceBookId);
    promotionPrice = priceHelper.getPromotionPrice(product, promotions, salesPrice);

    if (promotionPrice && promotionPrice.available && salesPrice.compareTo(promotionPrice)) {
        salesPrice = promotionPrice;
    }

    if (salesPrice && listPrice && salesPrice.value === listPrice.value) {
        listPrice = null;
    }

    if (salesPrice.valueOrNull === null && (listPrice && listPrice.valueOrNull !== null)) {
        salesPrice = listPrice;
        listPrice = {};
    }
    return new ClbPrice(salesPrice, listPrice);
}

/**
 * Retrieves Byob Clb rice instance
 *
 * @param {dw.catalog.Product|dw.catalog.productSearchHit} inputProduct - API object for a product
 * @param {string} currency - Current session currencyCode
 * @param {boolean} useSimplePrice - Flag as to whether a simple price should be used, used for
 *     product tiles and cart line items.
 * @param {dw.util.Collection<dw.campaign.Promotion>} promotions - Promotions that apply to this
 *                                                                 product
 * @param {dw.catalog.ProductOptionModel} currentOptionModel - The product's option model
 * @return {TieredPrice|RangePrice|DefaultPrice} - The Byob product's Clb price
 */
function getByobPrice(inputProduct, currency, useSimplePrice, promotions, currentOptionModel) {
    var salesPrice;
    var listPrice;
    var product = inputProduct;
    var promotionPrice = money.NOT_AVAILABLE;
    var priceModel = currentOptionModel
        ? product.getPriceModel(currentOptionModel)
        : product.getPriceModel();


    // DEFAULT
    if ((product.master || product.variationGroup) && product.variationModel.variants.length > 0) {
        product = product.variationModel.variants[0];
        priceModel = product.priceModel;
    }

    listPrice = getListPrice(priceModel);
    salesPrice = product.getPriceModel().getPriceBookPrice("snack-pack-price-book").getValueOrNull();
    if (salesPrice) {
        // eslint-disable-next-line new-cap
        salesPrice = new money(salesPrice, product.priceModel.price.currencyCode);
    } else {
        // eslint-disable-next-line new-cap
        salesPrice = new money(0, 'USD');
    }
    promotionPrice = priceHelper.getPromotionPrice(product, promotions, salesPrice);

    if (promotionPrice && promotionPrice.available && salesPrice.compareTo(promotionPrice)) {
        salesPrice = promotionPrice;
    }

    if (salesPrice && listPrice && salesPrice.value === listPrice.value) {
        listPrice = null;
    }

    if (salesPrice.valueOrNull === null && (listPrice && listPrice.valueOrNull !== null)) {
        salesPrice = listPrice;
        listPrice = {};
    }
    return new ByobPrice(salesPrice, listPrice);
}

module.exports = {
    getPrice: getPrice,
    getByobPrice: getByobPrice
};
