/* global empty, session */
'use strict';

/**
 * Order.js
 * @extends app_storefront_base/cartridge/controllers/Order.js
 *
 * Extends & Overrides the default behaviors for the base Order.js controller
 * endpoints.
 */

// SFCC system class imports
var ContentMgr = require('dw/content/ContentMgr');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

// SFCC module imports
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var server = require('server');
var HookMgr = require('dw/system/HookMgr');

// Extend the base controller.
server.extend(module.superModule);

function getBoxContent(res) {
    var boxContents = {};
    var order = res.viewData.order;
    for (var j = 0; j < order.items.items.length; j++) {
        var item = order.items.items[j];

        if (item.isByobMaster && !empty(item.boxId)) {
            boxContents[item.boxId] = [];
        } else if (!empty(item.boxId) && (typeof boxContents[item.boxId] !== 'undefined')) {
            boxContents[item.boxId].push({
                id: item.id,
                quantity: item.quantity
            });
        }
    }
    return boxContents;
}

function getBoxContents(res) {
    var boxContents = {};

    for (var i = 0; i < res.viewData.orders.length; i++) {
        var order = res.viewData.orders[i];

        for (var j = 0; j < order.items.items.length; j++) {
            var item = order.items.items[j];

            if (item.isByobMaster && !empty(item.boxId)) {
                boxContents[item.boxId] = [];
            } else if (!empty(item.boxId) && (typeof boxContents[item.boxId] !== 'undefined')) {
                boxContents[item.boxId].push({
                    id: item.id,
                    quantity: item.quantity
                });
            }
        }
    }

    return boxContents;
}

server.get("Invoice", function (req, res, next) {
    var orderID = req.querystring.orderId;
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderID);
    var site = require('dw/system/Site').getCurrent();
    res.render('account/invoice', {
        order: order,
        site: site
    });
    next();
});

/**
 * Adds metadata for the the page title, page description, & SEO keywords to the
 * response's view-data before rendering the page to the client.
 *
 * @param {Object} req - The request wrapper object.
 * @param {Function} next - The next method in the middleware chain.
 * @param {string} assetName - The name of the myaccount content asset after the
 *      'myaccount-' prefix.
 */
function setResponseMeta(req, next, assetName) {
    var contentAsset = ContentMgr.getContent('myaccount-' + assetName);
    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }
    next();
}

/**
 * @extends Order-History
 *
 * Adds page metadata to the response for GET requests to Order-History.
 */
server.append('History', function (req, res, next) {
    var viewData = res.getViewData();
    viewData.boxContents = getBoxContents(res);
    res.setViewData(viewData);
    setResponseMeta(req, next, 'orderhistory');
}, pageMetaData.computedPageMetaData);

/**
 * @extends Order-Details
 *
 * Adds page metadata to the response for GET requests to Order-Details.
 */
server.append('Details', function (req, res, next) {
    var viewData = res.getViewData();
    viewData.isOrderHistory = true;
    viewData.showByobLineItems = true;
    viewData.boxContents = getBoxContent(res);
    res.setViewData(viewData);
    setResponseMeta(req, next, 'history');
}, pageMetaData.computedPageMetaData);

server.replace(
    'Track',
    consentTracking.consent,
    server.middleware.https,
    function (req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
        var order;
        var validForm = true;
        var target = req.querystring.rurl || 1;
        var actionUrl = URLUtils.url('Account-Login', 'rurl', target);
        var profileForm = server.forms.getForm('profile');
        profileForm.clear();

        if (req.form.trackOrderEmail
            && req.form.trackOrderPostal
            && req.form.trackOrderNumber) {
            order = OrderMgr.getOrder(req.form.trackOrderNumber);
        } else {
            validForm = false;
        }

        if (!order) {
            res.render('/account/login', {
                navTabValue: 'login',
                orderTrackFormError: validForm,
                profileForm: profileForm,
                userName: '',
                actionUrl: actionUrl
            });
            next();
        } else {
            var config = {
                numberOfLineItems: '*'
            };

            var currentLocale = Locale.getLocale(req.locale.id);

            var orderModel = new OrderModel(
                order,
                { config: config, countryCode: currentLocale.country, containerView: 'order' }
            );

            // check the email and postal code of the form
            if (req.form.trackOrderEmail.toLowerCase()
                    !== orderModel.orderEmail.toLowerCase()) {
                validForm = false;
            }

            if (req.form.trackOrderPostal
                !== orderModel.billing.billingAddress.address.postalCode) {
                validForm = false;
            }

            if (validForm) {
                var exitLinkText;
                var exitLinkUrl;

                exitLinkText = !req.currentCustomer.profile
                    ? Resource.msg('link.continue.shop', 'order', null)
                    : Resource.msg('link.orderdetails.myaccount', 'account', null);

                exitLinkUrl = !req.currentCustomer.profile
                    ? URLUtils.url('Home-Show')
                    : URLUtils.https('Account-Show');

                res.render('account/orderDetails', {
                    order: orderModel,
                    exitLinkText: exitLinkText,
                    exitLinkUrl: exitLinkUrl
                });
            } else {
                res.render('/account/login', {
                    navTabValue: 'login',
                    profileForm: profileForm,
                    orderTrackFormError: !validForm,
                    userName: '',
                    actionUrl: actionUrl
                });
            }

            var viewData = res.getViewData();
            viewData.isOrderHistory = true;
            viewData.showByobLineItems = true;
            res.setViewData(viewData);

            next();
        }
    }
);

server.append(
    'Confirm',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        var contentAsset = ContentMgr.getContent('order-confirm');
        var viewData = res.getViewData();

        if (!empty(contentAsset)) {
            pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
        }

        var token = req.querystring.token ? req.querystring.token : null;
        var tokenJson = {};

        var isOriginalConfirmation = false;

        if (!empty(session.custom.token)) {
            tokenJson = JSON.parse(session.custom.token);
        }

        var sessionToken = tokenJson[token];

        if (empty(sessionToken)) {
            tokenJson[token] = true;
            session.custom.token = JSON.stringify(tokenJson);
            isOriginalConfirmation = true;
        }

        viewData.isOriginalConfirmation = isOriginalConfirmation;

        res.setViewData(viewData);

        // Reset the remove snack pack promo pricing flag
        session.custom.removeSnackPackPromotionalPricing = false;

        // checkout fraud prevention hook
        if (HookMgr.hasHook('kind.checkout.fraud.prevention')) {
            HookMgr.callHook('kind.checkout.fraud.prevention', 'fraudPrevention', req);
        }

        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(req.querystring.ID);
        var Site = require('dw/system/Site');
        var ArrayList = require('dw/util/ArrayList');
        var Transaction = require('dw/system/Transaction');

        var esku = Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs");
        var foundexclusive = false;
        if (esku !== null) {
            var lineitems = order.allProductLineItems;
            var exclusiveskus = new ArrayList(Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs"));
            var exclusivenames = new ArrayList();
            var foundexclusivee = false;

            for (var item in lineitems) { // eslint-disable-line
                if (exclusiveskus.contains(lineitems[item].productID)) { // eslint-disable-line
                    exclusivenames.add(lineitems[item].lineItemText); //    eslint-disable-line
                }
            }

            for (var items in lineitems) { // eslint-disable-line
                foundexclusivee = exclusiveskus.contains(lineitems[items].productID);
                if (foundexclusivee) {
                    foundexclusive = true;
                }
            }
        }
        var Transaction = require('dw/system/Transaction'); // eslint-disable-line
        if (foundexclusive) {
            Transaction.wrap(function () {
                order.exportStatus = 0;
            });
        }

        return next();
    },
    pageMetaData.computedPageMetaData
);

module.exports = server.exports();
