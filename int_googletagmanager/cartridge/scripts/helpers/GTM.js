/* global empty, session */
/**
 * Google Tag manager ecomm helpers
 */

var ArrayList = require('dw/util/ArrayList');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var Money = require('dw/value/Money');
var Product = require('dw/catalog/ProductMgr');
var CustomOrderHelpers = require('*/cartridge/scripts/checkout/customOrderHelpers');
var BasketMgr = require('dw/order/BasketMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');

function orderItemDataLayer(order) {
    var orderProducts = [];
    for (let i = 0; i < order.items.items.length; i++) {
        let orderItem = order.items.items[i];
        // don't include BYOB box components
        if (!orderItem.isByobMaster && !empty(orderItem.boxId)) {
            continue;
        }
        let subscriptionType = CustomOrderHelpers.getSubscriptionType(orderItem.masterId, orderItem.id);

        var product = Product.getProduct(orderItem.masterId);
        var badge = null;
        let flavour = null;
        let byobGmBoxSize = null;
        let byobGmBoxName = null;
        if (Object.prototype.hasOwnProperty.call(product, 'custom')) {
            if (Object.prototype.hasOwnProperty.call(product.custom, 'badge')) {
                badge = product.custom.badge ? product.custom.badge.value.toString(): null;
            }
            if (Object.prototype.hasOwnProperty.call(product.custom, 'gmFlavour')) {
                flavour = product.custom.gmFlavour ? product.custom.gmFlavour : null;
            }
        }


        // Variant value
        var bundleItemQuantity = 0;
        if(orderItem.productType == 'bundle') {
            bundleItemQuantity = orderItem.bundledProductLineItems[0].bundleItemQuantity;
        }
        var variant = bundleItemQuantity > 0 ? bundleItemQuantity + 'count' : null;

        if(orderItem.isByobMaster && Object.prototype.hasOwnProperty.call(orderItem, 'boxId')) {
            var byobListId = orderItem.boxId;
            var thebox = ProductListMgr.getProductList(byobListId);
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'boxSize')) {
                byobGmBoxSize = thebox.custom.boxSize;
                variant = byobGmBoxSize + 'count';
            }
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'activeStarterCombo')) {
                byobGmBoxName = thebox.custom.activeStarterCombo;
            }
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'ogEvery')) {
                subscriptionType = thebox.custom.ogEvery;
            }
        }

        orderProducts.push({
            name: orderItem.productName,
            id: orderItem.id,
            price: orderItem.proratedPrice.decimal.toString(),
            brand: Resource.msg('global.brandname', 'common', null),
            category: orderItem.gtmCategory,
            variant: variant,
            dimension15: subscriptionType > 0 ? true : false,
            dimension16: subscriptionType > 0 ? subscriptionType + ' days' : null,
            dimension17: byobGmBoxSize,
            dimension18: badge,
            dimension19: flavour,
            dimension20: byobGmBoxName,
            quantity: orderItem.quantity
        });
    }
    return orderProducts;
}

function basketItemsDataLayer(basket) {
    var ecomProducts = [];
    for (let i = 0; i < basket.length; i++) {
        var basketItem = basket[i];
        // don't include BYOB box components
        if (!basketItem.isByobMaster && !empty(basketItem.boxId)) {
            continue;
        }
        let subscriptionType = CustomOrderHelpers.getSubscriptionType(basketItem.masterId, basketItem.id);

        // totalItemQuantity = 12 i think referance to box count
        var product = Product.getProduct(basketItem.masterId);
        var badge = null;
        let flavour = null;
        let byobGmBoxSize = null;
        let byobGmBoxName = null;
        if (Object.prototype.hasOwnProperty.call(product, 'custom')) {
            if (Object.prototype.hasOwnProperty.call(product.custom, 'badge')) {
                badge = product.custom.badge.value.toString();
            }
            if (Object.prototype.hasOwnProperty.call(product.custom, 'gmFlavour')) {
                flavour = product.custom.gmFlavour;
            }
        }

        // Variant value
        // variantProductId = basketItem.id
        var bundleItemQuantity = basketItem.bundleItemQuantity;
        var variant = bundleItemQuantity > 0 ? bundleItemQuantity + 'count' : null;

        if(basketItem.isByobMaster && Object.prototype.hasOwnProperty.call(basketItem, 'boxId')) {
            var byobListId = basketItem.boxId;
            var thebox = ProductListMgr.getProductList(byobListId);
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'boxSize')) {
                byobGmBoxSize = thebox.custom.boxSize;
                variant = byobGmBoxSize + 'count';
            }
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'activeStarterCombo')) {
                byobGmBoxName = thebox.custom.activeStarterCombo;
            }
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'ogEvery')) {
                subscriptionType = thebox.custom.ogEvery;
            }
        }



        ecomProducts.push({
            name: basketItem.productName,
            id: basketItem.id,
            price: basketItem.proratedPrice.decimal.toString(),
            brand: Resource.msg('global.brandname', 'common', null),
            category: basketItem.gtmCategory,
            variant: variant,
            dimension15: basketItem.isSnacksClubItem,
            dimension16: subscriptionType > 0 ? subscriptionType + ' days' : null,
            dimension17: byobGmBoxSize,
            dimension18: badge,
            dimension19: flavour,
            dimension20: byobGmBoxName,
            quantity: basketItem.quantity
        });
    }
    return ecomProducts;
}

function lineItemHelper(basket) {
    var lineItems = basket.shipping[0].productLineItems.items;
    var transactionProducts = [];


    for (var i = 0; i < lineItems.length; i++) {
        var lineItem = lineItems[i];
        var subscriptionType = CustomOrderHelpers.getSubscriptionType(lineItem.masterId, lineItem.id);

        // don't include BYOB box components
        if (!lineItem.isByobMaster && !empty(lineItem.boxId)) {
            continue;
        }

        var promotions = [];
        if (!empty(lineItem.appliedPromotions)) {
           for(var j = 0; j < lineItem.appliedPromotions.length; j++) {
               var promotion = lineItem.appliedPromotions[j];

                if (!empty(promotion.name)) {
                    promotions.push(promotion.name);
                }
            }
        }

        // totalItemQuantity = 12 i think referance to box count
        var product = Product.getProduct(lineItem.masterId);
        var badge = null;
        let flavour = null;
        let byobGmBoxSize = null;
        let byobGmBoxName = null;
        if (Object.prototype.hasOwnProperty.call(product, 'custom')) {
            if (Object.prototype.hasOwnProperty.call(product.custom, 'badge')) {
                badge = product.custom.badge.value.toString();
            }
            if (Object.prototype.hasOwnProperty.call(product.custom, 'gmFlavour')) {
                flavour = product.custom.gmFlavour;
            }
        }

        // Variant value
        // variantProductId = lineItems.id
        var bundleItemQuantity = lineItem.bundleItemQuantity;
        var variant = bundleItemQuantity > 0 ? bundleItemQuantity + 'count' : null;

        if(lineItem.isByobMaster && Object.prototype.hasOwnProperty.call(lineItem, 'boxId')) {
            var byobListId = lineItem.boxId;
            var thebox = ProductListMgr.getProductList(byobListId);
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'boxSize')) {
                byobGmBoxSize = thebox.custom.boxSize;
                variant = byobGmBoxSize + 'count';
            }
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'activeStarterCombo')) {
                byobGmBoxName = thebox.custom.activeStarterCombo;
            }
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'ogEvery')) {
                subscriptionType = thebox.custom.ogEvery;
            }
        }



        transactionProducts.push({
            name: lineItem.productName,
            id: lineItem.id,
            price: lineItem.proratedPrice.decimal.toString(),
            brand: Resource.msg('global.brandname', 'common', null),
            category: lineItem.gtmCategory,
            variant: variant,
            dimension15: lineItem.isSnacksClubItem,
            dimension16: subscriptionType > 0 ? subscriptionType + ' days' : null,
            dimension17: byobGmBoxSize,
            dimension18: badge,
            dimension19: flavour,
            dimension20: byobGmBoxName,
            quantity: lineItem.quantity,
            coupon: !empty(promotions) ? promotions.join('|') : null
        });

    }
    return transactionProducts;
}

function singleLineItemHelper(pli) {
    var pid = pli.productID;
    var variant = '';

    if (!empty(pli.product) && pli.product.isVariant()) {
        pid = pli.product.masterProduct.ID;
        var variationModel = pli.product.variationModel;
        variant = variationModel.getAllValues(variationModel.getProductVariationAttribute('color'))[0].getDisplayValue();
    }

    var promotions = [];
    if (!empty(pli.priceAdjustments)) {
        for (var j = 0; j < pli.priceAdjustments.length; j++) {
            var priceAdj = pli.priceAdjustments[j];
            promotions.push(priceAdj.promotionID);
        }
    }

    var category = null;
    var product = pli.product;
    if (!empty(product) && product.isVariant()) {
        product = product.masterProduct;
    }
    if (!empty(pli.category)) {
        category = getCategoryPath(pli.category);
    }
    else if (!empty(product)) {
        if (!empty(product.primaryCategory)) {
            category = product.primaryCategory.ID;
        }
        else if (!empty(product.classificationCategory)) {
            category = product.classificationCategory.ID;
        }
    }

    if (!pli.bundledProductLineItem) {
        return {
            'name': pli.productName,
            'id': pid,
            'price': pli.adjustedPrice.divide(pli.quantityValue).decimalValue.toString(),
            'brand': (!empty(pli.product) && !empty(pli.product.brand) ? pli.product.brand : null),
            'category': category.replace(/_/gi,'/'),
            'variant': variant,
            'quantity': pli.quantityValue,
            'coupon' : !empty(promotions) ? promotions.join('|') : null
        };
    }

    return null;
}

function summarizeLineItems(products) {
    var summarizedProducts = {};
    var transactionProducts = [];
    for (var i = 0; i < products.length; i ++) {
        var key = products[i]['id'];
        if (typeof summarizedProducts[key] !== 'undefined') {
            // Product is already there; average
            var currentProduct = summarizedProducts[key];
            var coupons;
            if (!empty(currentProduct['coupon']) && !empty(products[i]['coupon'])) {
                coupons = [currentProduct['coupon'], products[i]['coupon']].join('|');
            }
            else if (!empty(currentProduct['coupon'])) {
                coupons = currentProduct['coupon'];
            }
            else {
                coupons = products[i]['coupon'];
            }
            summarizedProducts[key] = {
                'name': currentProduct['name'],
                'id': currentProduct['id'],
                'price': ((Number(currentProduct['price']) * Number(currentProduct['quantity'])) + (Number(products[i]['price']) * Number(products[i]['quantity']))) / (Number(currentProduct['quantity']) + Number(products[i]['quantity'])),
                'brand': currentProduct['brand'],
                'category': currentProduct['category'],
                'variant': currentProduct['variant'],
                'quantity': Number(currentProduct['quantity']) + Number(products[i]['quantity']),
                'coupon': coupons
            }
        }
        else {
            // Product is not there, add it
            summarizedProducts[key] = products[i];
        }
    }
    for (var key in summarizedProducts) {
        if (summarizedProducts.hasOwnProperty(key)) {
            transactionProducts.push(summarizedProducts[key]);
        }
    }
    return transactionProducts;
}


function getCategoryPath(cat) {
    if (empty(cat)) {
        return '';
    }

    var path = new ArrayList();
    while (!empty(cat) && !empty(cat.parent)) {
        if (!cat.online) {
            cat = cat.parent;
            continue;
        }
        path.addAt(0, cat.ID);
        cat = cat.parent;
    }

    return path.join('/');
}
exports.GetCategoryPath = getCategoryPath;

/**
 * Handles the Remove From Cart action
 *
 * action: removeFromCart
 */

/**
 * Handles the Remove From Cart action
 *
 * @param {Array[Object]} removedLineItems is product model type: productListItem.
 * @return {Object || null} Gtml remove data layer object
 * @constructor
 */
exports.RemoveFromCartHelper = function(removedLineItems) {
    if (removedLineItems.length === 0) return null;
    var dataLayer = {
        event: 'removeFromCart',
        ecommerce: {
            remove: {
                products: removedLineItems //[singleLineItemHelper(currentLineItem)]
            }
        }
    }
    return dataLayer;
}

exports.CHECKOUT_LOGIN = 1;
exports.SHIPPING = 2;
exports.BILLING = 3;
exports.SUMMARY = 4;

/**
 * Checkout steps tracking
 *
 * @arg basket dw.order.LineItemCtnr
 * @arg step Number step name (GTM.CART, etc)
 * @arg option Object additional "checkout_option" configuration
 */
exports.CheckoutStepDataLayerHelper = function(basket, step, option, DataLayer) {
    var _dataLayer;
    if (!empty(DataLayer)) {
        if (!empty(DataLayer['eventList'])) {
            _dataLayer = DataLayer;
        }
        else {
            _dataLayer = {
                'eventList': [
                    DataLayer
                ]
            };
        }
    }

    // If _dataLayer contains another checkout event, remove it
    if (!empty(_dataLayer)) {
        for (var i = 0; i < _dataLayer['eventList'].length; i++) {
            if (_dataLayer['eventList'][i].event === 'checkout') {
                _dataLayer['eventList'].splice(i, 1);
            }
        }
    }

    var products = lineItemHelper(basket);

    var dataLayer = {
        event: 'checkout',
        step: step,
        ecommerce: {
            checkout: {
                actionField : {
                    step: step
                },
                products: products
            }
        }
    };

    if (option) {
        dataLayer.shipping_method = option;
        dataLayer.ecommerce.checkout.actionField = {
            step: step,
            option:option
        }
    }

    if (!empty(_dataLayer)) {
        _dataLayer['eventList'].push(dataLayer);
        dataLayer = _dataLayer;
    }

    return dataLayer;
};


/**
 * Cart tracking
 *
 * @arg view basket
 */
exports.CartDataLayerHelper = function(basket, DataLayer) {
    var _dataLayer;
    if (!empty(DataLayer)) {
        if (!empty(DataLayer['eventList'])) {
            _dataLayer = DataLayer;
        }
        else {
            _dataLayer = {
                'eventList': [
                    DataLayer
                ]
            };
        }
    }

    // If _dataLayer contains another checkoutStep event, remove it
    if (!empty(_dataLayer)) {
        for (var i = 0; i < _dataLayer['eventList'].length; i++) {
            if (_dataLayer['eventList'][i].event === 'checkout') {
                _dataLayer['eventList'].splice(i, 1);
            }
        }
    }

    var products = basketItemsDataLayer(basket);
    var cart_size = 0;
    for (let i = 0; i < basket.length; i++) {
        let basketItem = basket[i];
        // don't include BYOB box components
        if (!basketItem.isByobMaster && !empty(basketItem.boxId)) {
            continue;
        }
        cart_size += 1;
    }

    var dataLayer = {
        cart_type: 'cart',
        cart_size: cart_size,
        event: 'checkout',
        ecommerce: {
            checkout: {
                actionField : {
                    step: 1
                },
                products: products
            }
        }
    };

    if (!empty(_dataLayer)) {
        _dataLayer['eventList'].push(dataLayer);
        dataLayer = _dataLayer;
    }

    return dataLayer;
};

/**
 * Generates a datalayer for a purchase event
 *
 * @arg order dw.order.Order
 */
exports.PurchaseHelper = function(order) {
    var CustomOrderHelpers = require('*/cartridge/scripts/checkout/customOrderHelpers');
    var products = orderItemDataLayer(order);

    var discounts = [];
    if (!empty(order.totals.discounts)) {
        for (var i = 0; i < order.totals.discounts.length; i++) {
            var discount = order.totals.discounts[i];

            if (!empty(discount.couponCode)) {
                discounts.push(discount.couponCode);
            } else if (!empty(discount.lineItemText)) {
                discounts.push(discount.lineItemText);
            }
        }
    }

    products.forEach(function (product) {
        var customTypeInt = CustomOrderHelpers.getSubscriptionType(product.id, product.variant)
        product.customerType = customTypeInt > 0 ? 'subscription' : 'non-subscription';
    });

    var revenue = new Money(order.totals.subTotalDecimal, session.getCurrency());

    if (!empty(order.totals.orderLevelDiscountTotal)) {
        var orderLevelDiscountTotal = new Money(order.totals.orderLevelDiscountTotal.value, session.getCurrency());
        revenue = revenue.subtract(orderLevelDiscountTotal);
    }

    var subscription_discount = 0;
    if(!empty(order.items.items)){
        for (let i = 0; i < order.items.items.length; i++) {
            var item = order.items.items[i];
            if (Object.prototype.hasOwnProperty.call(item.priceTotal, 'nonAdjustedPrice')) {
                var nonAdjustedPrice = item.priceTotal.nonAdjustedPrice.replace('$',"").replace(',','');
                var newNonAdjustedPrice = new Money(Number(nonAdjustedPrice),session.getCurrency());
                var price = item.priceTotal.price.replace('$',"").replace(',','');
                var newPrice = new Money(Number(price),session.getCurrency());
                var discount = newNonAdjustedPrice.subtract(newPrice).value;
                subscription_discount += discount;
            }
        }
    }

    var OrderMgr = require('dw/order/OrderMgr');
    var orderObject = OrderMgr.getOrder(order.orderNumber);
    var priceAdjustments = orderObject.getPriceAdjustments().iterator();
    var points_redemeed = null;
    var points_discount = null;
    while (priceAdjustments.hasNext()) {
        var priceAdjustment = priceAdjustments.next();
        var campaignID = priceAdjustment.campaignID;
        if(!empty(campaignID) && campaignID === 'Yotpo_Rewards-Loyalty') {
            var PromotionMgr = require('dw/campaign/PromotionMgr');
            var promotionId = priceAdjustment.promotionID;
            var promotion = PromotionMgr.getPromotion(promotionId);
            if (Object.prototype.hasOwnProperty.call(promotion.custom, 'yotpoPointsRedeem')) {
                points_redemeed = promotion.custom.yotpoPointsRedeem;
            }
            points_discount = priceAdjustment.priceValue.toString().replace('-',"");
        }
    }

    var dataLayerObj = {
        'payment_method' : order.billing.payment.selectedPaymentInstruments[0].paymentMethod,
        'shipping_method': order.shipping[0].selectedShippingMethod.ID,
        'points_redemeed' : points_redemeed,
        'points_discount': points_discount,
        'subscription_discount': subscription_discount == 0 ? null : subscription_discount.toString(),
        'ecommerce': {
            'purchase': {
                'actionField': {
                    'id': order.orderNumber,
                    'affiliation': Site.current.name,
                    'revenue': revenue.value.toString(),
                    'tax':order.totals.totalTaxDecimal.toString(),
                    'shipping': order.totals.totalShippingCostDecimal.toString(),
                    'coupon' : !empty(discounts) ? discounts.join('|') : null
                },
                'products': products
            }
        }
    };

    return dataLayerObj;
};


/**
 * Generates a datalayer for an account registration event
 */
exports.AccountRegistrationHelper = function(addToEmailList, source) {
    var dataLayerParams;
    dataLayerParams = 'accountRegSource=' + source;

    if ( addToEmailList ) {
        dataLayerParams += '&emailSignup=true';
    }

    return dataLayerParams;
}

exports.AccountRegistrationQueryStringToDataLayer = function() {
    var registrationSource = request.getHttpParameterMap().get('accountRegSource').value;
    var emailSignup = request.getHttpParameterMap().get('emailSignup').value;
    var dataLayerObj = { 'eventList': [] };

    if ( registrationSource === 'lightbox' ) {
        dataLayerObj['eventList'].push({
            'event': 'accountRegistrationLightbox'
        });
    }
    else if ( registrationSource === 'page' ) {
        dataLayerObj['eventList'].push({
            'event': 'accountRegistration'
        });
    }

    if ( emailSignup ) {
        dataLayerObj['eventList'].push({
            'event': 'registrationEmailSignup'
        });
    }

    return dataLayerObj;
}

/**
 * Generates a datalayer for newsletter signups
 */
exports.NewsletterPdictHelper = function(source) {
    var dataLayerObj = { 'eventList': [] };
    dataLayerObj['eventList'].push({
        'event': 'newsletterSignup' + source
    });
    return dataLayerObj;
}

exports.NewsletterHelper = function(source) {
    var dataLayerParams;
    dataLayerParams = 'newsletterSignupSource=' + source;
    return dataLayerParams;
}


/**
 * Generate a Product Detail Datalayer
 *
 * action: detail
 */
exports.ProductDetailDataLayerHelper = function(product, category) {
    var _category = !empty(category) ? category : product.getPrimaryCategory();
    var variant = null;
    var pid = product.getID();

    if (product.isVariant()) {
        pid = product.getMasterProduct().ID;
        variant = product.getID();
        _category = product.getMasterProduct().getPrimaryCategory();
    }

    var dataLayer = {
        ecommerce: {
            detail: {
                products : [{
                    'name' : product.getName(),
                    'id' : pid,
                    'brand' : Resource.msg('global.brandname', 'common', null),
                    'category' : getCategoryPath(_category),
                    'price' : product.getPriceModel().getPrice().value,
                    'variant' : variant
                }]
            }
        }
    };

    return dataLayer;
};

