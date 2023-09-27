/* eslint-disable */
/* global session */ // eslint-disable-line
'use strict';

/**
 * Cart.js
 * @extends app_storefront_base/cartridge/controllers/Cart.js
 *
 * Extends the behavior for endpoints of the base Cart.js controller.
 */

// SFCC system class imports
var ContentMgr = require('dw/content/ContentMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');
var BasketMgr = require('dw/order/BasketMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var CartModel = require('*/cartridge/models/cart');
var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
var sessionFlash = require('*/cartridge/scripts/util/sessionFlash');
var URLUtils = require('dw/web/URLUtils');
var ProductLineItemsModel = require('*/cartridge/models/productLineItems');
var collections = require('*/cartridge/scripts/util/collections');
// var session = require("dw/system/Session");

// SFCC module imports
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
var server = require('server');

var CustomOrderHelpers = require('*/cartridge/scripts/checkout/customOrderHelpers');

/**
 * Checks whether any of the basket's line items are BYOB, and updates the session accordingly
 *
 * @param {Object} lineItems - JSON of line items on the basket model
 * @returns {boolean} - Whether the lineitems contain a product with isByobMaster set to true
 */
function checkForByobItems(lineItems) {
    if (!empty(lineItems)) {
        var len = lineItems.length;

        for (var i = 0; i < len; i++) {
            var lineItem = lineItems[i];

            if (!empty(lineItem.isByobMaster) && lineItem.isByobMaster) {
                return true;
            }
        }
    }

    return false;
}

server.post('AddMultipleProducts', function (req, res, next) {
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var BYOBHelpers = require('*/cartridge/scripts/helpers/byobHelpers');

    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var previousBonusDiscountLineItems;
    var results = {};
    var newBonusDiscountLineItem;
    var messages = [];

    var form = req.form;
    if (!empty(form)) {
        Object.keys(form).forEach(function (i) {
            var item = JSON.parse(form[i]);
            var isExcludeItem = Object.hasOwnProperty.call(item, 'isExcludeItem') ? item.isExcludeItem : false;
            if (!isExcludeItem) {
                previousBonusDiscountLineItems = currentBasket.getBonusDiscountLineItems();

                var productId = item.pid;

                var childProducts = Object.hasOwnProperty.call(item, 'childProducts')
                    ? JSON.parse(item.childProducts)
                    : [];
                var options = item.options ? JSON.parse(item.options) : [];
                var quantity;
                var pidsObj;
                var result;

                if (currentBasket) {
                    Transaction.wrap(function () {
                        if (item.isByobMaster) {
                            // create ProductList
                            var productList = BYOBHelpers.createProductList(item.pid);

                            // add box contents
                            result = BYOBHelpers.updateBYOBList(productList, {
                                boxSku: productId,
                                items: JSON.parse(item.childProducts)
                            });

                            // add to cart
                            if (result.success) {
                                result = BYOBHelpers.addListToCart(productList);
                            } else {
                                // Set data for front-end handling
                                result.error = !result.success;
                                result.message = result.errorMessage;
                            }
                        } else if (!item.pidsObj) {
                            quantity = parseInt(item.quantity, 10);
                            result = cartHelper.addProductToCart(
                                currentBasket,
                                "" + productId,
                                quantity,
                                childProducts,
                                options
                            );
                        } else {
                            // product set
                            pidsObj = JSON.parse(item.pidsObj);
                            result = {
                                error: false,
                                message: Resource.msg('text.alert.addedtobasket', 'product', null)
                            };

                            pidsObj.forEach(function (PIDObj) {
                                quantity = parseInt(PIDObj.qty, 10);
                                var pidOptions = PIDObj.options ? JSON.parse(PIDObj.options) : {};
                                var PIDObjResult = cartHelper.addProductToCart(
                                    currentBasket,
                                    PIDObj.pid,
                                    quantity,
                                    childProducts,
                                    pidOptions
                                );
                                if (PIDObjResult.error) {
                                    result.error = PIDObjResult.error;
                                    result.message = PIDObjResult.message;
                                }
                            });
                        }
                        if (!result.error) {
                            cartHelper.ensureAllShipmentsHaveMethods(currentBasket);
                            basketCalculationHelpers.calculateTotals(currentBasket);
                        }
                    });
                }

                var urlObject = {
                    url: URLUtils.url('Cart-ChooseBonusProducts').toString(),
                    configureProductstUrl: URLUtils.url('Product-ShowBonusProducts').toString(),
                    addToCartUrl: URLUtils.url('Cart-AddBonusProducts').toString()
                };

                newBonusDiscountLineItem =
                    cartHelper.getNewBonusDiscountLineItem(
                        currentBasket,
                        previousBonusDiscountLineItems,
                        urlObject,
                        result.uuid
                    );
                if (newBonusDiscountLineItem) {
                    var allLineItems = currentBasket.allProductLineItems;
                    collections.forEach(allLineItems, function (pli) {
                        if (pli.UUID === result.uuid) {
                            Transaction.wrap(function () {
                                pli.custom.bonusProductLineItemUUID = 'bonus'; // eslint-disable-line no-param-reassign
                                pli.custom.preOrderUUID = pli.UUID; // eslint-disable-line no-param-reassign
                            });
                        }
                    });
                }

                messages.push({
                    error: result.error,
                    message: result.message
                });
                results[result.uuid] = result;
            }
        });

        sessionFlash.addFlashMessage('cartAlerts', messages);
        var quantityTotal = ProductLineItemsModel.getTotalQuantity(currentBasket.productLineItems);
        var cartModel = new CartModel(currentBasket);

        res.json({
            form: form,
            quantityTotal: quantityTotal,
            cart: cartModel,
            newBonusDiscountLineItem: newBonusDiscountLineItem || {},
            results: results
        });
    }

    next();
});

// Extend the base controller.
server.extend(module.superModule);

/**
 * @extends Cart-Show
 * Adds page metadata to the response for the Cart-Show web page.
 */
server.append('Show', function (req, res, next) {
    var ProductListMgr = require('dw/customer/ProductListMgr');
    var Site = require('dw/system/Site');
    var Resource = require('dw/web/Resource');
    var site = Site.getCurrent();
    if (site.ID == "kind_b2b" && !session.isCustomerAuthenticated()) { // eslint-disable-line
        res.base.redirect(URLUtils.url('Home-Show'));
    }
    var contentAsset = ContentMgr.getContent('cart-show');
    var viewData = res.getViewData();

    viewData.siteID = site.ID;

    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }

    // Clear any stale PayPal session data.
    req.session.privacyCache.set('payPalOrderNumber', null);

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket.bonusDiscountLineItems.empty) {
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        cartHelper.checkBonusDiscountLines(currentBasket);
        currentBasket = BasketMgr.getCurrentBasket();
    }

    var basketModel = new CartModel(currentBasket);
    if (!empty(basketModel) && !empty(basketModel.items)) {
        session.custom.byobInCart = checkForByobItems(basketModel.items);
    } else {
        session.custom.byobInCart = false;
    }

    viewData.customerGroups = req.currentCustomer.raw.getCustomerGroups();
    viewData.flash = sessionFlash.getFlashMessage('cartAlerts');

    var lineItems = currentBasket.getAllProductLineItems();
    var ArrayList = require('dw/util/ArrayList');
    var recList = new ArrayList();

    collections.forEach(lineItems, function (pli) {
        var rec = pli.product.isVariant() ? pli.product.masterProduct : pli.product;
        recList.add(rec);
    });

    var byobsub = false;
    var byobListId;

    var esku = Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs");
    if (esku !== null) {
        var ArrayList = require('dw/util/ArrayList');
        var lineitems = BasketMgr.getCurrentBasket().productLineItems;
        // eslint-disable-next-line
        var exclusiveskus = new ArrayList(Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs"));
        var foundexclusive = false;
        var foundexclusivee = false;
        var foundnonexclusive = false;
        var exclusivenames = new ArrayList();
        var byoberror = false;

        for (var item in lineitems) {
            var sku = lineitems[item].productID;
            if (!exclusiveskus.contains(sku) && (!lineitems[item].custom.hasOwnProperty("boxID") ||
            (lineitems[item].custom.hasOwnProperty("isByobMaster") && lineitems[item].custom.isByobMaster === true))) {
                exclusivenames.add(lineitems[item].lineItemText);
                if (lineitems[item].lineItemText === "build your own box") {
                    byobListId = lineitems[item].custom.boxID;
                    byoberror = true;
                }
            }
        }

        for (var item in lineitems) {
            var sku = lineitems[item].productID;
            foundexclusivee = exclusiveskus.contains(sku);
            if (!foundexclusivee) {
                foundnonexclusive = true;
            } else {
                foundexclusive = true;
            }
        }

        if (foundexclusive && foundnonexclusive) {
            viewData.byoberror = byoberror;
            viewData.errormessage = Resource.msg('error.exclusive', "cart", null) +
                exclusivenames.join(", ");
            // sessionFlash.addFlashMessage('cartAlerts', [{
            //     message: "Your cart contains items that can only be bought exclusively. All other items in your cart will need to be removed except for the exclusive items in your cart " +
            //     exclusivenames.join(", "),
            //     error: true
            // }]);
        }
    }

    if (byobListId) {
        var thebox = ProductListMgr.getProductList(byobListId);
        if (thebox && thebox.custom.ogEvery > 0) {
            byobsub = true;
            viewData.isByobSub = byobsub;
        }
    }

    viewData.recommendedProducts = recList;

    var swapids = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementItems');
    var swapbarid = swapids[0];
    var swapbar = ProductMgr.getProduct(swapbarid);
    var defaultbar = ProductMgr.getProduct(swapbarid).name;
    var cust = req.currentCustomer;
    if (cust.raw.authenticated) {
        var swapbarid = cust.raw.profile.custom.swapbar;
        if (swapbarid) {
            swapbar = ProductMgr.getProduct(swapbarid);
        }
    } else {
        if (session.custom.swapbarid) {
            swapbarid = session.custom.swapbarid;
            swapbar = ProductMgr.getProduct(swapbarid);
        }
    }

    viewData.swapname = swapbar.name;
    viewData.defaultbar = defaultbar;
    res.setViewData(viewData);

    next();
}, pageMetaData.computedPageMetaData);


/**
 * @extends Cart-MiniCartShow
 * Clear out session data for prior PayPal attempts.
 */
server.append(
    'MiniCartShow',
    function (req, res, next) {
        req.session.privacyCache.set('payPalOrderNumber', null);
        var currentBasket = BasketMgr.getCurrentBasket();
        res.viewData.bonusItems = currentBasket.bonusLineItems;
        next();
    }
);

// Get around not having access to getAbsImageURL in the view
// Get responsive images of specific sizes for PDP primary slider
function responsiveSliderImages(pid, normal, small) {
    var product = ProductMgr.getProduct(pid);
    var images = product.getImages('large').toArray();
    var responsiveImages = [];
    var sizeNormal = normal || 817;
    var sizeSmall = small || 375;

    if (!empty(images)) {
        images.forEach(function (image) {
            responsiveImages.push({
                normal: responsiveImageUtils.getResponsiveImage(image, sizeNormal),
                small: responsiveImageUtils.getResponsiveImage(image, sizeSmall)
            });
        });
    }

    return responsiveImages;
}

server.extend(module.superModule);

server.append('GetProduct', function (req, res, next) {
    var viewData = res.getViewData();

    viewData.responsiveImages = responsiveSliderImages(viewData.product.id);

    res.setViewData(viewData);

    next();
});
server.append('UpdateQuantity', function (req, res, next) {
    var viewData = res.getViewData();
    var currentBasket = BasketMgr.getCurrentBasket();
    var canBeUpdated = false;
    if (!currentBasket) {
        return next();
    }

    var updateQuantity = parseInt(req.querystring.quantity, 10);
    var productId = req.querystring.pid;
    var uuid = req.querystring.uuid;
    var productLineItems = currentBasket.productLineItems;
    var bundleItems;
    var matchingLineItem = collections.find(productLineItems, function (item) {
        return item.productID === productId && item.UUID === uuid;
    });
    var bonusDiscountLineItemCount = currentBasket.bonusDiscountLineItems.length;

    if (!empty(viewData.errorMessage) && viewData.errorMessage === Resource.msg('error.cannot.update.product.quantity', 'cart', null)) {
        // The base controller already checked if the item has enough inventory.  If we're here, we're only checking for perpetual status
        if (matchingLineItem) {
            if (matchingLineItem.product.bundle) {
                bundleItems = matchingLineItem.bundledProductLineItems;
                canBeUpdated = collections.every(bundleItems, function (item) {
                    return item.product.availabilityModel.inventoryRecord.perpetual;
                });
            } else {
                canBeUpdated = matchingLineItem.product.availabilityModel.inventoryRecord.perpetual;
            }
        }

        if (canBeUpdated) {
            Transaction.wrap(function () {
                matchingLineItem.setQuantityValue(updateQuantity);

                var previousBounsDiscountLineItems = collections.map(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                    return bonusDiscountLineItem.UUID;
                });

                basketCalculationHelpers.calculateTotals(currentBasket);
                if (currentBasket.bonusDiscountLineItems.length > bonusDiscountLineItemCount) {
                    var prevItems = JSON.stringify(previousBounsDiscountLineItems);

                    collections.forEach(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                        if (prevItems.indexOf(bonusDiscountLineItem.UUID) < 0) {
                            bonusDiscountLineItem.custom.bonusProductLineItemUUID = matchingLineItem.UUID; // eslint-disable-line no-param-reassign
                            matchingLineItem.custom.bonusProductLineItemUUID = 'bonus';
                            matchingLineItem.custom.preOrderUUID = matchingLineItem.UUID;
                        }
                    });
                }
            });
        }

        if (matchingLineItem && canBeUpdated) {
            var basketModel = new CartModel(currentBasket);
            res.setStatusCode(200); // This will only be happening if there's an error message, which means the error message needs to be changed from 500 to a non-error
            res.json(basketModel);
        } else {
            res.setStatusCode(500);
            res.json({
                errorMessage: Resource.msg('error.cannot.update.product.quantity', 'cart', null)
            });
        }
    }

    return next();
});

server.append('EditBonusProduct', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var collections = require('*/cartridge/scripts/util/collections');
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var duuid = req.querystring.duuid;
    var bonusDiscountLineItem = collections.find(currentBasket.getBonusDiscountLineItems(), function (item) {
        return item.UUID === duuid;
    });
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');

    var selectedBonusProducts = collections.map(bonusDiscountLineItem.bonusProductLineItems, function (bonusProductLineItem) {
        return {
            pid: bonusProductLineItem.productID,
            name: bonusProductLineItem.productName,
            submittedQty: bonusProductLineItem.quantityValue
        };
    });

    var pids = collections.pluck(bonusDiscountLineItem.bonusProducts, 'ID').join();

    res.json({
        selectedBonusProducts: selectedBonusProducts,
        addToCartUrl: URLUtils.url('Cart-AddBonusProducts').relative().toString(),
        showProductsUrl: URLUtils.url('Product-ShowBonusProducts').toString(),
        maxBonusItems: bonusDiscountLineItem.maxBonusItems,
        pageSize: cartHelper.BONUS_PRODUCTS_PAGE_SIZE,
        pliUUID: bonusDiscountLineItem.custom.bonusProductLineItemUUID,
        uuid: bonusDiscountLineItem.UUID,
        bonusChoiceRuleBased: bonusDiscountLineItem.bonusChoiceRuleBased,
        selectprods: [],
        labels: {
            selectprods: "Choose " + bonusDiscountLineItem.maxBonusItems + " free snack(s)",
            close: Resource.msg('link.choiceofbonus.close', 'product', null)
        },
        showProductsUrlRuleBased: URLUtils.url('Product-ShowBonusProducts', 'DUUID', bonusDiscountLineItem.UUID, 'pagesize', cartHelper.BONUS_PRODUCTS_PAGE_SIZE, 'pagestart', 0, 'maxpids', bonusDiscountLineItem.maxBonusItems).toString(),
        showProductsUrlListBased: URLUtils.url('Product-ShowBonusProducts', 'DUUID', bonusDiscountLineItem.UUID, 'pids', pids, 'maxpids', bonusDiscountLineItem.maxBonusItems).toString()
    });
    next();
});

server.append('EditProductLineItem', function (req, res, next) {
    var viewData = res.getViewData();
    var currentBasket = BasketMgr.getCurrentBasket();
    var canBeUpdated = false;
    if (!currentBasket) {
        return next();
    }

    var updateQuantity = parseInt(req.form.quantity, 10);
    var uuid = req.form.uuid;
    var productId = req.form.pid;
    var productLineItems = currentBasket.allProductLineItems;
    var bundleItems;
    var requestLineItem = collections.find(productLineItems, function (item) {
        return item.UUID === uuid;
    });

    var uuidToBeDeleted = null;
    var pliToBeDeleted;
    var newPidAlreadyExist = collections.find(productLineItems, function (item) {
        if (item.productID === productId && item.UUID !== uuid) {
            uuidToBeDeleted = item.UUID;
            pliToBeDeleted = item;
            updateQuantity += parseInt(item.quantity, 10);
            return true;
        }
        return false;
    });

    if (!empty(viewData.errorMessage) && viewData.errorMessage === Resource.msg('error.cannot.update.product', 'cart', null)) {
        // The base controller already checked if the item has enough inventory.  If we're here, we're only checking for perpetual status
        if (requestLineItem) {
            if (requestLineItem.product.bundle) {
                bundleItems = requestLineItem.bundledProductLineItems;
                canBeUpdated = collections.every(bundleItems, function (item) {
                    return item.product.availabilityModel.inventoryRecord.perpetual;
                });
            } else {
                canBeUpdated = requestLineItem.product.availabilityModel.inventoryRecord.perpetual;
            }
        }

        var error = false;
        if (canBeUpdated) {
            var product = ProductMgr.getProduct(productId);

            try {
                Transaction.wrap(function () {
                    if (newPidAlreadyExist) {
                        var shipmentToRemove = pliToBeDeleted.shipment;
                        currentBasket.removeProductLineItem(pliToBeDeleted);
                        if (shipmentToRemove.productLineItems.empty && !shipmentToRemove.default) {
                            currentBasket.removeShipment(shipmentToRemove);
                        }
                    }

                    if (!requestLineItem.product.bundle) {
                        requestLineItem.replaceProduct(product);
                    }

                    requestLineItem.setQuantityValue(updateQuantity);

                    basketCalculationHelpers.calculateTotals(currentBasket);
                });
            } catch (e) {
                error = true;
            }
        }

        if (!error && requestLineItem && canBeUpdated) {
            var cartModel = new CartModel(currentBasket);

            var responseObject = {
                cartModel: cartModel,
                newProductId: productId
            };

            if (uuidToBeDeleted) {
                responseObject.uuidToBeDeleted = uuidToBeDeleted;
            }

            res.setStatusCode(200);
            res.json(responseObject);
        } else {
            res.setStatusCode(500);
            res.json({
                errorMessage: Resource.msg('error.cannot.update.product', 'cart', null),
                test: error
            });
        }
    }

    return next();
});

server.append('AddProduct', function (req, res, next) {
    var currentBasket = BasketMgr.getCurrentBasket();

    var q = request;
    var info = req.form;

    var prod = ProductMgr.getProduct(info.pid);

    var hookmgr = require('dw/system/HookMgr');
    hookmgr.callHook('app.facebook.facebookEvents', 'sendAddToCart', q, info, request);

    if (!empty(currentBasket)) {
        var productLineItems = currentBasket.allProductLineItems;

        if (!productLineItems.empty) {
            productLineItems.toArray().forEach(function (pli) {
                if (pli.productID == prod.ID) {
                    if (!empty(pli.product)) {
                        var productCustom = pli.product.getCustom();
                        var pliCustom = pli.getCustom();

                        // Get the value of hidden variant from product
                        var hideComponents = 'isHiddenComponents' in productCustom &&
                        !empty(productCustom) ? productCustom.isHiddenComponents : '';

                        if (!empty(hideComponents) && hideComponents) {
                            Transaction.wrap(function () {
                                pliCustom.isHiddenComponents = hideComponents;
                            });
                        }
                    }
                }
            });
        }
    }
    // Klaviyo include
    if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
        var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoUtils');
        KlaviyoUtils.trackAddToCart();
    }
    //
    return next();
});

server.get('BuildMiniCartUA', function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();
    var CustomOrderHelpers = require('*/cartridge/scripts/checkout/customOrderHelpers');
    var ProductListMgr = require('dw/customer/ProductListMgr');

    var vd = res.getViewData();
    var uaobj = {};
    uaobj.cart_type = 'minicart';
    uaobj.cart_size = basket.productQuantityTotal;
    uaobj.event = "checkout";
    uaobj.ecommerce = {};
    uaobj.ecommerce.currencyCode = basket.currencyCode;
    uaobj.ecommerce.actionField = {"step":1 };
    uaobj.ecommerce.products = [];
    var byobGmBoxsize = null;
    var byobGmBoxName = null;
    collections.forEach(basket.productLineItems, function (pli) {
        byobGmBoxsize = null;
        byobGmBoxName = null;
        var subscriptionType = CustomOrderHelpers.getSubscriptionType(pli.product.masterProduct.ID, pli.productID);
        if(pli.custom.isByobMaster && Object.prototype.hasOwnProperty.call(pli.custom, 'boxID')) {
            var byobListId = pli.custom.boxID;
            var thebox = ProductListMgr.getProductList(byobListId);
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'boxSize')) {
                byobGmBoxsize = thebox.custom.boxSize;
            }
            if (Object.prototype.hasOwnProperty.call(thebox.custom, 'activeStarterCombo')) {
                byobGmBoxName = thebox.custom.activeStarterCombo;
            }
        }

        if ((Object.prototype.hasOwnProperty.call(pli.custom, 'boxID') && pli.custom.isByobMaster)
        || !Object.prototype.hasOwnProperty.call(pli.custom, 'boxID')) {
            var prodobj = {
                "id": pli.productID,
                "name": pli.product.name,
                "price": pli.adjustedNetPrice.value,
                "brand": pli.product.brand,
                "category": pli.product.custom.googleProductCategory,
                "dimension17": byobGmBoxsize,
                "dimension20": byobGmBoxName,
                "quantity": pli.quantityValue,
                "dimension16": subscriptionType,
                "dimension15": subscriptionType > 0 ? true : false,
                "dimension19": pli.product.custom.gmFlavour ? pli.product.custom.gmFlavour : null,
                "dimension18": pli.product.custom.badge.displayValue ? pli.product.custom.badge.displayValue : null,
            };
            uaobj.ecommerce.products.push(prodobj);
        }
    });
    vd.uaobj = uaobj;
    res.setViewData(uaobj);
    res.json(uaobj);

    return next();
});

server.prepend('RemoveProductLineItem', function (req, res, next) {
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var ProductListMgr = require('dw/customer/ProductListMgr');
    var collections = require('*/cartridge/scripts/util/collections');
    var currentBasket = BasketMgr.getCurrentBasket();
    var viewData = res.getViewData();

    var removedProducts = [];
    var gtmRemovedItems = [];
    if (req.querystring.pid && req.querystring.uuid) {
        var productLineItems = currentBasket.getAllProductLineItems();
        var byobMaster;
        var item;
        var i;

        for (i = 0; i < productLineItems.length; i++) {
            item = productLineItems[i];
            if (item.getUUID() === req.querystring.uuid) {
                var productLineItem = ProductFactory.get({ pid: req.querystring.pid, pview: 'productLineItem', lineItem: item, quantity: item.quantity.value })

                // GTM related code blocks
                var subscriptionType = CustomOrderHelpers.getSubscriptionType(item.productID, productLineItem.masterId);
                var product = item.product;
                var badge = null;
                let flavour = null;
                let byobGmBoxSize = null;
                let byobGmBoxName = null;
                var variant = 0;
                if (item.bundledProductLineItems.length) {
                    collections.forEach(item.bundledProductLineItems, function (bundleItem) {
                        variant += bundleItem.quantityValue;
                    });
                } else {
                    variant += item.quantityValue;
                }
                if (Object.prototype.hasOwnProperty.call(product, 'custom')) {
                    if (Object.prototype.hasOwnProperty.call(product.custom, 'badge')) {
                        badge = product.custom.badge.value.toString();
                    }
                    if (Object.prototype.hasOwnProperty.call(product.custom, 'gmFlavour')) {
                        flavour = product.custom.gmFlavour;
                    }
                }
                if (item.custom.hasOwnProperty("boxID") &&
                    item.custom.hasOwnProperty("isByobMaster") &&
                    item.custom.isByobMaster === true) {
                    var byobListId = item.custom.boxID;
                    if (byobListId) {
                        var thebox = ProductListMgr.getProductList(byobListId);
                        if (Object.prototype.hasOwnProperty.call(thebox.custom, 'boxSize')) {
                            byobGmBoxSize = thebox.custom.boxSize;
                            variant += byobGmBoxSize;
                        }
                        if (Object.prototype.hasOwnProperty.call(thebox.custom, 'activeStarterCombo')) {
                            byobGmBoxName = thebox.custom.activeStarterCombo;
                        }
                        if (Object.prototype.hasOwnProperty.call(thebox.custom, 'ogEvery')) {
                            subscriptionType = thebox.custom.ogEvery;
                        }
                    }
                }

                gtmRemovedItems.push(
                    {
                        item: productLineItem,
                        subscriptionFrequency: empty(subscriptionType) ||  subscriptionType === 0 ? null : subscriptionType + ' days',
                        badge: badge,
                        flavour: flavour,
                        byobGmBoxSize: byobGmBoxSize,
                        byobGmBoxName: byobGmBoxName,
                        variant: variant === 0 ? null :  variant + 'count'
                    });
                // end GTM related code block

                removedProducts.push(productLineItem);

                if (item.custom.isByobMaster) {
                    byobMaster = item;
                }
            }
        }

        // If the customer is removing a BYOB box, remove any box content line items
        if (!empty(byobMaster)) {
            Transaction.wrap(function () {
                for (i = 0; i < productLineItems.length; i++) {
                    item = productLineItems[i];

                    if (!item.custom.isByobMaster && (byobMaster.custom.boxID === item.custom.boxID)) {
                        currentBasket.removeProductLineItem(item);
                    }
                }
            });
        }
    }
    viewData.gtmRemovedItems = gtmRemovedItems;
    res.json({ removedProducts: removedProducts });

    return next();
});

server.append('MiniCart', server.middleware.include, function (req, res, next) {
    var viewData = res.getViewData();
    var currentBasket = BasketMgr.getCurrentOrNewBasket();

    if (currentBasket) {
        viewData.quantityTotal = ProductLineItemsModel.getTotalQuantity(currentBasket.productLineItems);
    }

    next();
});

server.append('AddBonusProducts', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
    var Transaction = require('dw/system/Transaction');
    var collections = require('*/cartridge/scripts/util/collections');
    var Resource = require('dw/web/Resource');
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var data = JSON.parse(req.querystring.pids);
    var pliUUID = req.querystring.pliuuid;
    var newBonusDiscountLineItems = currentBasket.getBonusDiscountLineItems();
    var qtyAllowed = data.totalQty;
    var totalQty = 0;

    for (var i = 0; i < data.bonusProducts.length; i++) {
        totalQty += data.bonusProducts[i].qty;
    }
    if (totalQty > qtyAllowed) {
        res.json({
            errorMessage: Resource.msgf(
                'error.alert.choiceofbonus.max.quantity',
                'product',
                null,
                qtyAllowed,
                totalQty),
            error: true,
            success: false
        });
    } else {
        var bonusDiscountLineItem = collections.find(newBonusDiscountLineItems, function (item) {
            return item.UUID === req.querystring.uuid;
        });

        if (currentBasket) {
            Transaction.wrap(function () {
                collections.forEach(bonusDiscountLineItem.getBonusProductLineItems(), function (dli) {
                    if (dli.product) {
                        currentBasket.removeProductLineItem(dli);
                    }
                });

                var pli;
                data.bonusProducts.forEach(function (bonusProduct) {
                    var product = ProductMgr.getProduct(bonusProduct.pid);
                    var selectedOptions = bonusProduct.options;
                    var optionModel = productHelper.getCurrentOptionModel(
                        product.optionModel,
                        selectedOptions);
                    pli = currentBasket.createBonusProductLineItem(
                        bonusDiscountLineItem,
                        product,
                        optionModel,
                        null);
                    pli.setQuantityValue(bonusProduct.qty);
                    pli.custom.bonusProductLineItemUUID = pliUUID;
                });

                collections.forEach(currentBasket.getAllProductLineItems(), function (productLineItem) {
                    if (productLineItem.UUID === pliUUID) {
                        productLineItem.custom.bonusProductLineItemUUID = 'bonus';// eslint-disable-line no-param-reassign
                        productLineItem.custom.preOrderUUID = productLineItem.UUID;// eslint-disable-line no-param-reassign
                    }
                });
            });
        }

        res.json({
            totalQty: currentBasket.productQuantityTotal,
            msgSuccess: Resource.msg('text.alert.choiceofbonus.addedtobasket', 'product', null),
            success: true,
            error: false
        });
    }
    next();
});

module.exports = server.exports();
