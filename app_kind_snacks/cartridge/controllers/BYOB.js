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
    // SFCC API imports
    var Site = require('dw/system/Site');

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
    var Site = require('dw/system/Site');

    // Function level declarations
    var site = Site.getCurrent();
    var byobCatId = site.getCustomPreferenceValue('byobRootCategoryID');
    var actionParam = req.querystring.action;
    var idsParam = req.querystring.pids;
    var dataParam = req.querystring.update;
    var jsonParam = req.querystring.json;
    var action = !empty(actionParam) ? actionParam : '';
    var pIds = !empty(idsParam) ? JSON.parse(idsParam) : [];
    var updateData = !empty(dataParam) ? JSON.parse(dataParam) : {};
    var returnJSON = !empty(jsonParam) ? jsonParam : false;
    var result = {
        success: true,
        errorMessage: ''
    };
    var isAjax = req.querystring.isAjax || false;

    var byobTemplate = isAjax ? 'product/components/productList/byobListBody' :
        'product/components/productList/byobList';

    // Try to get an existing BYOB box for the customer.
    var byobList = BYOBHelpers.getBYOBList(session.customer);
    var boxSku = !empty(byobList) && !empty(byobList.custom.boxSku) ?
        byobList.custom.boxSku : '';
    var isAddedToCart = byobList.custom.isAddedToCart;

    // Get the string for each product ID. When parsed, the type may be different.
    if (!empty(pIds)) {
        pIds = pIds.map(function (pid) {
            return String(pid);
        });
    }

    // Check to make sure a list was found.
    if (!empty(byobList)) {
        // Set the box ID in the session variable.
        session.custom.currentByobId = byobList.ID;

        // Check if an action was specified.
        if (!empty(action)) {
            // Call the corresponding helper method.
            switch (action) {
                case 'add':
                    result = BYOBHelpers.addToBYOBList(byobList, updateData);
                    break;
                case 'remove':
                    result = BYOBHelpers.removeFromBYOBList(byobList, pIds);
                    break;
                case 'removeall':
                    result = BYOBHelpers.removeAllFromBYOBList(byobList);
                    break;
                case 'update':
                    result = BYOBHelpers.updateBYOBList(byobList, updateData);
                    break;
                case 'reset':
                    result = BYOBHelpers.resetBYOBList(byobList);
                    break;
                default:
                    byobLog.warn('Unsupported action for BYOB-List: {0}', action);
                    break;
            }
        }

        // Get the upated ProductList model.
        var plModel = new ProductListModel(byobList);

        if (result.success) {
            // If no action was specified, no changed occurred
            // So don't change combo name
            if (!empty(action)) {
                // If a combo has just been added to the box, sets that combo name
                // Otherwise, clears out the name
                Transaction.wrap(function () {
                    byobList.custom.activeStarterCombo = result.comboName || '';
                    plModel.activeStarterCombo = byobList.custom.activeStarterCombo;
                });
            }

            var viewData = {
                byobPostAddToCartRedirectUrl: !empty(byobList.custom.ogPublicID) ? URLUtils.https('Account-MSI') : URLUtils.https('Cart-Show'),
                isAddedToCart: isAddedToCart,
                productList: plModel,
                isOGListUpdate: !empty(byobList.custom.ogPublicID),
                ogUpdateListUrl: URLUtils.https('BYOB-UpdateOrderGrooveSubscription'),
                isListFull: parseInt(plModel.boxSize, 10) === parseInt(plModel.totalInBox, 10)
            };

            if (isAddedToCart) {
                viewData.updateCartUrl = URLUtils.https('BYOB-UpdateListInCart');
            } else {
                viewData.addToCartUrl = URLUtils.https('BYOB-AddListToCart');
            }

            viewData.isByob = true;
            viewData.every = byobList.custom.ogEvery;

            // Add the ID of the container to the view data.
            if (!empty(boxSku)) {
                viewData.boxSku = boxSku;
            }

            // If the json HTTP parameter was specified, then return JSON,
            // otherwise return the rendered template.
            if (returnJSON) {
                // Add a URL for the user to continue to the BYOB Category
                // Configurator page.
                viewData.continueUrl = !empty(byobCatId) ?
                    URLUtils.https('Search-Show', 'cgid', byobCatId).toString() :
                    URLUtils.https('Home-Show').toString();
                viewData.error = false;

                res.json(viewData);
            } else {
                res.render(byobTemplate, viewData);
            }
        } else {
            res.json({
                error: true,
                errorMessage: result.errorMessage
            });
        }
    } else {
        var errMsg = 'ERROR: Unable to find or create a valid BYOB list';
        byobLog.error(errMsg);
        response.setContentType('application/json');
        res.json({
            error: true,
            errorMessage: errMsg,
            redirectUrl: URLUtils.https('Product-SubmitBox').toString()
        });
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

        var productLineItems = basket.allProductLineItems;

        if (!productLineItems.empty) {
            var bundleid;
            var bundlemaster;
            var boxid;
            productLineItems.toArray().forEach(function (pli) {
                if (!empty(pli.product)) {
                    if (Object.prototype.hasOwnProperty.call(pli.custom, "boxID")) {
                        if (Object.prototype.hasOwnProperty.call(pli.custom, "isByobMaster") && pli.custom.isByobMaster) {
                            boxid = pli.custom.boxID;
                            bundleid = pli.custom.boxID;
                            bundlemaster = true;
                        } else {
                            bundlemaster = false;
                        }
                        Transaction.wrap(function () {
                            pli.custom.isBundleMaster = bundlemaster;
                            pli.custom.bundleID = boxid;
                        });
                    } else if ((pli.productID == "23514-00" || pli.productID == "26671-00" || pli.productID == "23513-00")) { // eslint-disable-line
                        bundlemaster = false;
                        Transaction.wrap(function () {
                            pli.custom.isBundleMaster = bundlemaster;
                            pli.custom.bundleID = bundleid;
                        });
                    }
                }
            });
        }

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

    if (pid) {
        var byobItem = BYOBHelpers.getByobListItem(byobList, pid);

        if (byobList && byobList.custom.boxSize) {
            var boxSize = parseInt(byobList.custom.boxSize, 10);
            maxQuantity = maxQuantity == null ? boxSize : Math.min(maxQuantity, boxSize);
        }

        var selectedQuantity = !empty(pid) ? BYOBHelpers.getBYOBListQuantity(byobList, pid) : 0;
        var decrementDisabled = selectedQuantity <= minQuantity;
        var incrementDisabled = !empty(byobList) && parseInt(BYOBHelpers.getBYOBListItemCount(byobList), 10) === maxQuantity;

        res.render('product/components/byobTileQuantity', {
            itemPid: pid,
            byobItem: byobItem,
            decrementDisabled: decrementDisabled,
            incrementDisabled: incrementDisabled,
            minQuantity: minQuantity,
            maxQuantity: maxQuantity
        });
    } else {
        res.render('product/components/byobTileQuantity', { itsnull: true });
    }

    return next();
});

module.exports = server.exports();
