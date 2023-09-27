/* eslint-disable */
'use strict';

/**
 * Checkout.js
 * @extends app_storefront_base/cartridge/controllers/Checkout.js
 *
 * Extends the base endpoint behaviors for the Checkout.js controller.
 */

// SFCC system class imports
var ContentMgr = require('dw/content/ContentMgr');
var Site = require('dw/system/Site');
var Mac = require('dw/crypto/Mac');
var Encoding = require('dw/crypto/Encoding');
var ArrayList = require('dw/util/ArrayList');
var Cookie = require('dw/web/Cookie');

// SFRA Includes
var server = require('server');
server.extend(module.superModule);

// SFCC module imports
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');

/**
 * @extends Checkout-Begin
 *
 * Add a listener for the start of the route to check for stale PayPal
 * orders that need to be failed to recover the session's basket.
 */
server.prepend('Begin', function (req, res, next) {
    var Logger = require('dw/system/Logger');
    var OrderMgr = require('dw/order/OrderMgr');
    var Status = require('dw/system/Status');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var cdpmLogger = Logger.getLogger('paymentOperator', 'paymentOperator');

    var Site = require('dw/system/Site');
    var esku = Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs");
    var ArrayList = require('dw/util/ArrayList');
    var BasketMgr = require('dw/order/BasketMgr');
    if (esku !== null && BasketMgr.getCurrentBasket() !== null) {
        var lineitems = BasketMgr.getCurrentBasket().productLineItems;
        var exclusiveskus = new ArrayList(Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs"));
        var foundexclusive = false;
        var foundexclusivee = false;
        var foundnonexclusive = false;

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
            res.base.redirect(URLUtils.url('Cart-Show'));
        }
    }

    // Function level declarations
    var site = Site.getCurrent();
    if (site.ID == "kind_b2b" && !session.isCustomerAuthenticated()) { // eslint-disable-line
        res.base.redirect(URLUtils.url('Home-Show'));
    }

    try {
        // Check if there is a PayPal order.
        var ppOrderNo = req.session.privacyCache.get('payPalOrderNumber');
        if (ppOrderNo) {
            // Get the order if it exists.
            var order = OrderMgr.getOrder(ppOrderNo);
            if (!empty(order)) {
                // Fail the order.
                var failStatus = Transaction.wrap(function () {
                    return OrderMgr.failOrder(order);
                });

                if (failStatus !== Status.ERROR) {
                    // Clear the session variable.
                    req.session.privacyCache.set('payPalOrderNumber', null);
                    res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
                }
            }
        }
    } catch (err) {
        cdpmLogger.error('Error while trying to cancel order! '
            + ', ' + err.fileName + ': ' + err.message + '\n' + err.stack);
    }

    return next();
});

/**
 * @extends Checkout-Begin
 *
 * If a customer has a preferred address, CustomerAddress.custom.email property
 * value is assiged to the email address for each shipment's ShippingAddress.
 */
server.append('Begin', function (req, res, next) {
    var contentAsset = ContentMgr.getContent('checkout-begin');
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var collections = require('*/cartridge/scripts/util/collections');
    var shippingHelpers = require('*/cartridge/scripts/checkout/customShippingHelpers');

    var addressForm = server.forms.getForm('address');
    addressForm.clear();

    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }

    var currentBasket = BasketMgr.getCurrentBasket();
    var currentCustomer = req.currentCustomer.raw;
    var customer = currentCustomer;
    var preferredAddress;

    // only true if customer is registered
    if (currentCustomer.authenticated &&
        !empty(currentCustomer.addressBook) &&
        !empty(currentCustomer.addressBook.preferredAddress)
    ) {
        var shipments = currentBasket.shipments;
        preferredAddress = currentCustomer.addressBook.preferredAddress;

        collections.forEach(shipments, function (shipment) {
            if (empty(shipment.shippingAddress)) {
                Transaction.wrap(function () {
                    shipment.createShippingAddress();
                });
            }

            if (empty(shipment.shippingAddress.custom.email)) {
                Transaction.wrap(function () {
                    shipment.shippingAddress.custom.email = preferredAddress.custom.email;
                });
            }
        });
    }


    var totalWeight = 0;
    var pliCollection = currentBasket.getAllLineItems();
    pliCollection.toArray().forEach(function (lineItem) {
        if (Object.prototype.hasOwnProperty.call(lineItem, 'product')) {
            if (Object.prototype.hasOwnProperty.call(lineItem.product, 'custom')) {
                if (Object.prototype.hasOwnProperty.call(lineItem.product.custom, 'weight')) {
                    var weight = lineItem.product.custom.weight;
                    totalWeight += (weight * lineItem.getQuantity());
                }
            }
        }
    });

    var viewData = res.getViewData();
    viewData.profile = req.currentCustomer.profile;
    viewData.weight = totalWeight;

    var shipping = shippingHelpers.getShippingModels(currentBasket, currentCustomer, 'basket');
    viewData.order.shipping = shipping;

    if (customer.isAuthenticated()) {
        var customerNo: String = customer.getProfile().getCustomerNo();
        var epoch: String = (Date.now() / 1000.0).toPrecision(10).toString();
        var encryptor: Mac = new Mac(Mac.HMAC_SHA_256);
        var hashInput: String = customerNo + "|" + epoch;
        var hashKey: String = Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantHashKey');
        var hashBytes: Bytes = encryptor.digest(hashInput, hashKey);
        var hash: String = Encoding.toBase64(hashBytes);
        var contentList: ArrayList = new ArrayList();
        contentList.add1(customerNo);
        contentList.add1(epoch);
        contentList.add1(hash);
        var content: String = contentList.join("|");
        var cookie: Cookie = new Cookie("og_auth", content);
        cookie.setSecure(true); // secure cookie
        cookie.setMaxAge(7200); // 2 hour expiration in seconds
        cookie.setPath("/"); // base path
        response.addHttpCookie(cookie); // response is an implicit variable according to the API
        var swapid = session.custom.swapbar;
        var cust = session.customer;
        if (cust.authenticated && swapid) {
            Transaction.wrap(function () {
                cust.profile.custom.swapbar = swapid;
            });
        }
    }

        res.setViewData(viewData);

        return next();
    }, pageMetaData.computedPageMetaData);

module.exports = server.exports();
