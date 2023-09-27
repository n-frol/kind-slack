/* eslint-disable */
/* global empty, session, response */
'use strict';

/**
 * BYOB.js
 *
 * A controller providing endpoints for working with the Build Your Own Box
 * (BYOB) feature and the associated ProductList instances.
 */

// SFCC API imports
var Logger = require('dw/system/Logger');
var ProductMgr = require('dw/catalog/ProductMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var ProductInventoryMgr = require("dw/catalog/ProductInventoryMgr");
var Site = require('dw/system/Site');

// SFRA module imports
var server = require('server');

// Script & model imports
var BYOBHelpers = require('*/cartridge/scripts/helpers/byobHelpers');
var ProductListModel = require('*/cartridge/models/product/productList');
var RetrieveSubscription = require('int_ordergroove/cartridge/scripts/retrieveSubscription');
var sessionFlash = require('*/cartridge/scripts/util/sessionFlash');
var UpdateSubscription = require('int_ordergroove/cartridge/scripts/updateSubscription');

// Module level declarations
var byobLog = Logger.getLogger('byob', 'byob');

// Handles errors during edit subscription process
function handleSubscriptionError(logMessage, errorResourceID, res, next) {
    byobLog.error(logMessage);
    sessionFlash.addFlashMessage('subscriptionUpdated', [{ error: true, message: Resource.msg(errorResourceID, 'error', null) }]);
    res.redirect(URLUtils.https('Account-MSI'));
    next();
}

// Populates list with contents of OG subscription specified by public_id param
server.get('PopulateOrderGrooveSubscription', server.middleware.https, function (req, res, next) {

    // Function level declarations
    var site = Site.getCurrent();
    var byobCatId = site.getCustomPreferenceValue('byobRootCategoryID');

    if (!session.customer.authenticated) {
        byobLog.error('User not authenticated');
        res.redirect(URLUtils.https('Home-Show'));
        next();
        return;
    }

    var customerID = session.customer.profile.customerNo;
    var params = req.querystring;
    if (empty(params.public_id)) {
        handleSubscriptionError('Missing public_id parameter', 'byob.error.editsubscription', res, next);
        return;
    }

    var subscriptionPublicID = params.public_id;
    var apiResult = RetrieveSubscription.retrieveSubscription(customerID, subscriptionPublicID);

    if (!apiResult.ok) {
        handleSubscriptionError(apiResult.msg + ' : ' + apiResult.errorMessage, 'byob.error.editsubscription', res, next);
        return;
    }

    var subscription = JSON.parse(apiResult.object.text);

    if (empty(subscription)) {
        handleSubscriptionError('Subscription matching ID : ' + subscriptionPublicID + ' not found for customer ID: ' + customerID, 'byob.error.editsubscription', res, next);
        return;
    }

    // create product list and add products from OG subscription
    var list = BYOBHelpers.getBYOBList(session.customer);
    if (empty(list)) {
        list = BYOBHelpers.createProductList(subscription.product);
    }
    BYOBHelpers.removeAllFromBYOBList(list);
    var itemHash = {};

    for (var j = 0; j < subscription.components.length; j++) {
        var product = ProductMgr.getProduct(subscription.components[j].product);

        if (!empty(product)) {
            if (empty(itemHash[product.ID])) {
                itemHash[product.ID] = 1;
            } else {
                itemHash[product.ID]++;
            }
        }
    }

    var updateData = {};
    updateData.boxSku = subscription.product;
    updateData.every = subscription.every;
    updateData.everyPeriod = subscription.every_period;
    updateData.ogPublicID = subscription.public_id;
    updateData.items = [];
    var itemKeys = Object.keys(itemHash);
    for (var k = 0; k < itemKeys.length; k++) {
        var pid = itemKeys[k];
        var quantity = itemHash[pid];
        updateData.items.push({ pid: pid, quantity: quantity });
    }

    BYOBHelpers.updateBYOBList(list, updateData);

    var continueUrl = !empty(byobCatId) ?
        URLUtils.https('Search-Show', 'cgid', byobCatId).toString() :
        URLUtils.https('Home-Show').toString();
    res.redirect(continueUrl);
    next();
});


server.post('UpdateOrderGrooveSubscription', server.middleware.https, function (req, res, next) {
    if (!session.customer.authenticated) {
        res.setStatusCode(410);
        byobLog.error('User not authenticated');
        res.json({});
        next();
        return;
    }

    var customerID = session.customer.profile.customerNo;

    var byobList = BYOBHelpers.getBYOBList(session.customer);
    var customer = session.customer.profile;

    var boxsize = byobList.custom.boxSize;
    var itemCount = !empty(byobList) ?
        BYOBHelpers.getBYOBListItemCount(byobList) : 0;
    boxsize = parseInt(boxsize, 0);

    if (boxsize !== itemCount) {
        sessionFlash.addFlashMessage('subscriptionUpdated',
            [{ error: true, message: Resource.msg('byob.counterror', 'byob', null) }]);
        byobLog.error('User ' + customer.email + ' has failed on a BYOB itemCount check');
        res.json({});
        next();
        return;
    }

    if (empty(byobList)) {
        byobLog.error('No BYOB list returned for customer');
        res.setStatusCode(500);
        res.json({});
        next();
        return;
    }

    var apiResult = UpdateSubscription.updateSubscription(customerID, byobList);

    if (!apiResult.ok) {
        byobLog.error(apiResult.msg + ' : ' + apiResult.errorMessage);
        res.setStatusCode(500);
        res.json({});
        next();
        return;
    }
    sessionFlash.addFlashMessage('subscriptionUpdated', [{ error: false, message: 'Subscription Updated' }]);
    res.json({});
    next();
});


/**
 * BYOB-ConfirmEmpty
 *
 * Renders a modal template for the user to confirm that they want to empty the
 * current contents of their BYOB box. This will only be shown if the user
 * has items in their current BYOB box.
 *
 * *HTTP Request Parameters:*
 * @param {string} pid - The product ID for the starter combo to add to the list.
 * @param {string} context - The context of the confirm-empty modal. Currently
 *      supported contexts are:
 *      * _pdp_ (default): When a user updates the size of the box from the PDP.
 *      * _combo_: When a user selects a starter combo.
 */
server.get('ConfirmEmpty', server.middleware.https, function (req, res, next) {
    var params = req.querystring;
    var byobList = BYOBHelpers.getBYOBList(session.customer);
    var context = !empty(params.context) ?
        params.context : 'pdp';
    var pid = !empty(params.pid) ? params.pid : '';
    var removeAction = params.removeAction || 'removeall';
    var itemCount = !empty(byobList) ?
        BYOBHelpers.getBYOBListItemCount(byobList) : 0;
    var viewData = {};

    if (itemCount) {
        // Adding Starter Combo
        if (context === 'combo' && !empty(pid)) {
            var pData = {};
            pData[pid] = { quantity: 1 };
            // Set the view data URLs.
            viewData = {
                removeUrl: URLUtils.https('BYOB-List',
                    'action', 'removeall',
                    'pid', req.querystring.pid || '',
                    'json', true),
                addUrl: URLUtils.https('BYOB-List',
                    'action', 'add',
                    'update', JSON.stringify(pData)),
                isStarterCombo: true
            };
        } else {
            viewData.removeUrl = URLUtils.https('BYOB-List',
                'action', removeAction,
                'pids', (pid ? '["' + pid + '"]' : ''),
                'isAjax', true);
            viewData.addUrl = URLUtils.https('Product-SubmitBox');
            viewData.isStarterCombo = false;
        }

        viewData.emptyPrompt = params.emptyPrompt || 'byob-empty-your-box';
        viewData.emptyButtonText = !empty(params.emptyButtonText) ? decodeURI(params.emptyButtonText) : Resource.msg('button.byob.emptyyourbox', 'product', null);

        res.render('product/components/productList/confirmEmptyList', viewData);
    } else {
        // Log the error and return a JSON error.
        byobLog.error('No list with items found for current customer.');
        res.json({
            error: true,
            errorMessage: Resource.msg('byob.error.noitems', 'error', null)
        });
    }

    return next();
});

/**
 * BYOB-ActionButton
 *
 * An Ajax endpoint for getting the correct BYOB Action button when the user
 * visits a BYOB box master product. These products are flagged with the Product
 * custom attribute `isByobMaster`.
 *
 * *HTTP Request Prameters:*
 * @param {string} pid - The current product page's product ID.
 * @param {string} size - The value of the selected size attribute for the
 *      BYOB box product.
 */
server.get('ActionButton', server.middleware.https, function (req, res, next) {
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var addURL = URLUtils.https('Product-SubmitBox');
    var confirmEmptyUrl = URLUtils.https('BYOB-ConfirmEmpty', 'context', 'pdp');

    // Get the HTTP parameters.
    var pidParam = req.querystring.pid;
    var productModel = !empty(pidParam) ? ProductFactory.get({
        pid: pidParam
    }) : {};

    // Get the customer's current BYOB list if it exists.
    var byobList = BYOBHelpers.getBYOBList(session.customer);

    // If the customer does not have a current list, then use the 'Get Started'
    // action for the button.
    if (empty(byobList)) {
        res.render('product/components/createByobList', {
            buttonText: Resource.msg('button.getstarted', 'common', null),
            addToCartUrl: addURL,
            confirmEmptyUrl: confirmEmptyUrl,
            product: productModel
        });
    } else {
        res.render('product/components/createByobList', {
            buttonText: Resource.msg('button.continueediting', 'common', null),
            boxSku: byobList.custom.boxSku,
            addToCartUrl: addURL,
            confirmEmptyUrl: confirmEmptyUrl,
            product: productModel
        });
    }

    return next();
});

// Get around not having access to getAbsImageURL in the view
// Get responsive images of specific sizes for PDP primary slider
function responsiveSliderImages(pid) {
    var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');
    var product = ProductMgr.getProduct(pid);
    var images;
    if (!empty(product) && !empty(product.getImages('large'))) {
        images = product.getImages('large').toArray();
    }
    var responsiveImages = [];

    if (!empty(images)) {
        images.forEach(function (image) {
            responsiveImages.push(responsiveImageUtils.getResponsiveImage(image, 475, 950, '', 'jpg'));
        });
    }

    return responsiveImages;
}

/**
 * BYOB-List
 *
 * An Ajax endpoint for getting a BYOB ProductList.If a customer's list does
 * not yet exist, a new ProductList instance is created for the user.
 *
 * *HTTP Request Prameters:*
 * @param {string[]} [action] - If updating the customer list, this parameter is
 *      used to sepecify the action. Available actions: add, remove, removeall,
 *      update, and reset.
 * @param {string[]} [pids] - The product IDs to carry the action out on. This
 *      field is required add & remove calls.
 * @param {Object[]} [update] - An array of update objects containing key/value
 *      pairs for the product ID to identify the product, and any attributes of
 *      the current line item that need to be updated (so far only quantity is
 *      supported for update).
 * @param {boolean} [json] - An optional flag to get a JSON response instead of
 *      a rendered template.
 */
server.get('List', server.middleware.https, function (req, res, next) {
    // SFCC API imports
    var isAjax = req.querystring.isAjax || false;
    var jsonParam = req.querystring.json;
    var returnJSON = !empty(jsonParam) ? jsonParam : false;

    var byobTemplate = isAjax ? 'product/components/productList/swapListBody' :
        'product/components/productList/swapList';

    var plModel = {
        items: {},

    };

    var pars = req.querystring;
    var linkref = pars.ref;

    if (!linkref) {
        linkref = "cart";
    }

    var cust = req.currentCustomer;
    var swapids = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementItems');
    var swapbarid = swapids[0];
    if (session.custom.swapbarid) {
        swapbarid = session.custom.swapbarid;
    }
    if (cust.raw.authenticated && cust.raw.profile.custom.swapbar) {
        swapbarid = cust.raw.profile.custom.swapbar;
    }
    var swapbar = ProductMgr.getProduct(swapbarid);
    plModel.items = [];
    if (swapbar) {
        var images = responsiveSliderImages(swapbarid);
        var item = {
            responsiveImages: images,
            productName: swapbar.name
        }
        plModel.items.push(item);
    }

    plModel.length = plModel.items.length;
    plModel.totalInBox = plModel.items.length;
    plModel.boxSize = 1;

    var viewData = {
        productList: plModel
    };

    viewData.isByob = true;
    viewData.linkref = linkref;

    viewData.referrer = req.session.clickStream.last.referer;

    // If the json HTTP parameter was specified, then return JSON,
    // otherwise return the rendered template.
    if (returnJSON) {
        // Add a URL for the user to continue to the BYOB Category
        // Configurator page.
        viewData.continueUrl = !empty(byobCatId) ?
            URLUtils.https('Search-Show', 'cgid', byobCatId).toString() :
            URLUtils.https('Home-Show').toString();
        viewData.error = false;
        res.render(byobTemplate, viewData);
    } else {
        res.render(byobTemplate, viewData);
    }
    return next();
});

/**
 * BYOB-AddListToCart
 *
 * Adds the customer's current BYOB list to the cart.
 */
server.post('AddListToCart', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    // Function level imports
    var CartModel = require('*/cartridge/models/cart');

    // Function level declarations
    var byobList = BYOBHelpers.getBYOBList(session.customer);
    var itemCount = !empty(byobList) && !empty(byobList.productItems) ?
        BYOBHelpers.getBYOBListItemCount(byobList) : 0;
    var boxSize = !empty(byobList) && !empty(byobList.custom.boxSize) ?
        parseInt(byobList.custom.boxSize, 10) : 0;

    var basket = BasketMgr.getCurrentOrNewBasket();
    var previousBonusDiscountLineItems = basket.getBonusDiscountLineItems();

    // Check to be sure the box is filled.
    if (!empty(itemCount) && !empty(boxSize) && itemCount === boxSize) {
        // Add the list items to the cart.
        var result = BYOBHelpers.addListToCart(byobList);

        if (result.error) {
            res.json({
                error: true,
                errorMessage: result.message
            });
        }

        var cartModel = new CartModel(basket);

        var urlObject = {
            url: URLUtils.url('Cart-ChooseBonusProducts').toString(),
            configureProductstUrl: URLUtils.url('Product-ShowBonusProducts').toString(),
            addToCartUrl: URLUtils.url('Cart-AddBonusProducts').toString()
        };

        var newBonusDiscountLineItem =
            cartHelper.getNewBonusDiscountLineItem(
                basket,
                previousBonusDiscountLineItems,
                urlObject,
                result.uuid
            );
        if (newBonusDiscountLineItem) {
            var allLineItems = basket.allProductLineItems;
            var collections = require('*/cartridge/scripts/util/collections');
            collections.forEach(allLineItems, function (pli) {
                if (pli.UUID === result.uuid) {
                    Transaction.wrap(function () {
                        pli.custom.bonusProductLineItemUUID = 'bonus'; // eslint-disable-line no-param-reassign
                        pli.custom.preOrderUUID = pli.UUID; // eslint-disable-line no-param-reassign
                    });
                }
            });
        }

        // This forces totals to update so OG pricebooks get applied
        if (basket) {
            Transaction.wrap(function () {
                cartHelper.ensureAllShipmentsHaveMethods(basket);
                basketCalculationHelpers.calculateTotals(basket);
            });
        }
        Transaction.wrap(function () {
            var ProductList = require('dw/customer/ProductList');
            var ProductListMgr = require('dw/customer/ProductListMgr');
            ProductListMgr.createProductList(session.customer, ProductList.TYPE_CUSTOM_1);
        });
        // Get a reference to the current basket
        res.json({
            error: false,
            redirectUrl: URLUtils.https('Cart-Show').toString(),
            boxSku: byobList.custom.boxSku || '',
            cart: cartModel,
            isByob: true,
            openMinicart: false
        });
    } else if (!empty(itemCount) && !empty(boxSize) && itemCount !== boxSize) {
        res.json({
            error: true,
            errorMessage: Resource.msg(
                'error.byobaddtocart.sizematch', 'search', null)
        });
    } else {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.update.technicalissue', 'search', null)
        });
    }

    return next();
});

server.get('UpdateOGFrequencyFromCartPage', function (req, res, next) {
    var params = req.querystring;
    var ProductListMgr = require('dw/customer/ProductListMgr');
    var byobList = ProductListMgr.getProductList(params.boxid);
    var newFreq = params.freq.split('_');
    Transaction.wrap(function () {
        byobList.custom.ogEvery = newFreq[0];
        byobList.custom.ogEveryPeriod = newFreq[1];
    });
    res.json({ succsess: true });

    return next();
});

/**
 * BYOB-UpdateListInCart
 *
 * Updates a BYOB box in the customer's cart
 */
server.post('UpdateListInCart', server.middleware.https, function (req, res, next) {
    // Function level imports
    var CartModel = require('*/cartridge/models/cart');
    // Function level declarations
    var byobList = BYOBHelpers.getBYOBList(session.customer);
    var itemCount = !empty(byobList) && !empty(byobList.productItems) ?
        BYOBHelpers.getBYOBListItemCount(byobList) : 0;
    var boxSize = !empty(byobList) && !empty(byobList.custom.boxSize) ?
        parseInt(byobList.custom.boxSize, 10) : 0;

    // Check to be sure the box is filled.
    if (!empty(itemCount) && !empty(boxSize) && itemCount === boxSize) {
        // Add the list items to the cart.
        var basket = BYOBHelpers.updateListInCart(byobList);
        // check to see if there's unattached bonus product line items
        /* eslint-disable */
        var bonusDiscountLineItems = basket.bonusDiscountLineItems;
        var pli
        if (bonusDiscountLineItems.length > 0) {
            var allLineItems = basket.allProductLineItems;
            var bonusAttached = false;
            var byobProduct;
            for (i = 0; i < allLineItems.length; i++) {
                pli = allLineItems[i];
                if (pli.custom.isByobMaster) {
                    byobProduct = pli;
                }
                if (pli.custom.bonusProductLineItemUUID == 'bonus') {
                    bonusAttached = true;
                }
            }
            if (!bonusAttached) {
                var bli;
                for (j = 0; j < bonusDiscountLineItems.length; j++) {
                    bli = bonusDiscountLineItems[j];
                    if (empty(bli.custom.bonusProductLineItemUUID || bli.custom.bonusProductLineItemUUID) != byobProduct.UUID) {
                        Transaction.wrap(function () {
                            bli.custom.bonusProductLineItemUUID = byobProduct.UUID;
                        });
                    }
                }
                Transaction.wrap(function () {
                    byobProduct.custom.bonusProductLineItemUUID = 'bonus';
                    byobProduct.custom.preOrderUUID = byobProduct.UUID;
                });

            }
        }
        /* eslint-enable */
        var cartModel = new CartModel(basket);

        // Get a reference to the current basket
        res.json({
            error: false,
            redirectUrl: URLUtils.https('Cart-Show').toString(),
            cart: cartModel,
            openMinicart: false
        });
    } else if (!empty(itemCount) && !empty(boxSize) && itemCount !== boxSize) {
        res.json({
            error: true,
            errorMessage: Resource.msg(
                'error.byobaddtocart.sizematch', 'search', null)
        });
    } else {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.update.technicalissue', 'search', null)
        });
    }

    return next();
});

server.get('StarterComboTiles', function (req, res, next) {
    var byobList = BYOBHelpers.getBYOBList(session.customer);

    res.render('product/starterComboTiles', {
        byobList: byobList
    });
    return next();
});

server.post('Changebar', function (req, res, next) {
    var data = req.querystring;
    var cust = session.customer;

    var swapids = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementItems');
    var swapbarid = swapids[0];
    var swapbar = ProductMgr.getProduct(swapbarid);

    var byobTemplate = 'product/components/productList/swapListBody';
    if (cust.authenticated) {
        Transaction.wrap(function () {
            cust.profile.custom.swapbar = data.pid;
        });
    }
    var byobList = BYOBHelpers.getBYOBList(session.customer);

    var plModel = {};

    var cust = req.currentCustomer;
    var swapids = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementItems');
    var swapbarid = swapids[0];
    var swapbar = ProductMgr.getProduct(swapbarid);
    if (cust.raw.authenticated) {
        swapbarid = cust.raw.profile.custom.swapbar;
        if (swapbarid) {
            swapbar = ProductMgr.getProduct(swapbarid);
        }
    } else {
        session.custom.swapbarid = data.pid;
        swapbar = ProductMgr.getProduct(data.pid);
        session.custom.swapbar = data.pid;
        swapbar = ProductMgr.getProduct(data.pid);
        swapbarid = data.pid;
    }
    plModel.items = [];
    if (swapbar) {
        var images = responsiveSliderImages(data.pid);
        var item = {
            responsiveImages: images,
            productName: swapbar.name
        }
        plModel.items.push(item);
    }

    plModel.length = plModel.items.length;
    plModel.totalInBox = plModel.items.length;
    plModel.boxSize = 1;

    var viewData = {
        productList: plModel,
        ogUpdateListUrl: URLUtils.https('BYOB-UpdateOrderGrooveSubscription'),
        isListFull: parseInt(plModel.boxSize, 10) === parseInt(plModel.totalInBox, 10),
        boxSize: parseInt(plModel.boxSize, 10)
    };

    res.render(byobTemplate, viewData);
    return next();
});

server.get('TileQuantity', function (req, res, next) {
    var byobList = BYOBHelpers.getBYOBList(session.customer);
    var params = req.querystring;
    var pid = params.pid;
    var invList = ProductInventoryMgr.getInventoryList();
    var inventory = invList && invList.getRecord(pid);
    var minQuantity = 0;
    var maxQuantity = inventory && inventory.perpetual ? 999 : null;
    if (inventory && !inventory.perpetual && inventory.ATS) {
        maxQuantity = inventory.ATS.value;
    }

    var byobItem = BYOBHelpers.getByobListItem(byobList, pid);

    if (byobList && byobList.custom.boxSize) {
        var boxSize = parseInt(byobList.custom.boxSize, 10);
        maxQuantity = maxQuantity == null ? boxSize : Math.min(maxQuantity, boxSize);
    }

    var selectedQuantity = !empty(pid) ? BYOBHelpers.getBYOBListQuantity(byobList, pid) : 0;
    var decrementDisabled = selectedQuantity <= minQuantity;
    var incrementDisabled = !empty(byobList) && parseInt(BYOBHelpers.getBYOBListItemCount(byobList), 10) === maxQuantity;

    var cust = req.currentCustomer;
    var swapids = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementItems');
    var swapbarid = swapids[0];
    if (session.custom.swapbarid) {
        swapbarid = session.custom.swapbarid;
    }
    if (cust.raw.authenticated && cust.raw.profile.custom.swapbar) {
        swapbarid = cust.raw.profile.custom.swapbar;
    }

    res.render('product/components/swapTileQuantity', {
        swapbarid: swapbarid,
        itemPid: pid,
        byobItem: byobItem,
        decrementDisabled: decrementDisabled,
        incrementDisabled: incrementDisabled,
        minQuantity: minQuantity,
        maxQuantity: maxQuantity
    });

    return next();
});

module.exports = server.exports();
