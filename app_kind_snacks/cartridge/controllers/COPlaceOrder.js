'use strict';
var server = require('server');

var OrderMgr = require('dw/order/OrderMgr');
var CustomerMgr = require('dw/customer/CustomerMgr');
var checkoutHelper = require('*/cartridge/scripts/checkout/checkoutHelpers');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var HookMgr = require('dw/system/HookMgr');
var URLUtils = require('dw/web/URLUtils');
var PaymentMgr = require('dw/order/PaymentMgr');


function isAutoShip(cookies) {
    if (empty(cookies)) {
        return false;
    }
    var autoShip = 0;
    for (var i = 0; i < cookies.getCookieCount(); i++) {
        var cookie = cookies[i];
        var cookieName = cookie.getName();
        if (cookieName === "og_autoship") {
            autoShip = Number(cookie.getValue());
            break;
        }
    }
    return Boolean(autoShip);
}


server.post('Submit', csrfProtection.generateToken, function (req, res, next) {
    var order = OrderMgr.getOrder(req.querystring.order_id);

    if (!order && req.querystring.order_token !== order.getOrderToken()) {
        return next(new Error('Order token does not match'));
    }
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', order);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order); });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);
        var fraudError = Resource.msg('error.technical', 'checkout', null);
        return next(new Error(fraudError));
    }
    // adding information to PaymentInstrument
    var paymentInstrument = order.getPaymentInstruments().toArray().pop();
    var paymentTransaction = paymentInstrument.getPaymentTransaction();
    var paymentProcessor = PaymentMgr.getPaymentMethod('CREDIT_CARD').getPaymentProcessor();

    Transaction.wrap(function () {
        var creditCardExpirationYear = paymentInstrument.custom.paymentOperatorCCExpiry.substr(0, 4);
        var creditCardExpirationMonth = paymentInstrument.custom.paymentOperatorCCExpiry.substr(4, 2);
        paymentInstrument.setCreditCardExpirationMonth(Number(creditCardExpirationMonth));
        paymentInstrument.setCreditCardExpirationYear(Number(creditCardExpirationYear));
        paymentTransaction.setPaymentProcessor(paymentProcessor);
        paymentTransaction.setTransactionID(order.getOrderNo());
    });


    var orderPlacementStatus = checkoutHelper.placeOrder(order, fraudDetectionStatus);

    if (orderPlacementStatus.error) {
        return next(new Error('Could not place order'));
    }

    var autoShip = false;
    var Site = require('dw/system/Site');
    if (!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") === true) {
        var cookies = request.getHttpCookies();
        autoShip = isAutoShip(cookies);
    }

    if (autoShip) {
        var customerNumber = order.getCustomerNo();
        var customer = CustomerMgr.getCustomerByCustomerNumber(customerNumber);
        var isCustomerAuthenticated = customer.isAuthenticated();
        var isPaymentInstrumentDuplicate = false;
        if (isCustomerAuthenticated) {
            var wallet = customer.getProfile().getWallet();
            var customerSavedPaymentInstruments = wallet.getPaymentInstruments('DW_APPLE_PAY').isEmpty() ? [] : wallet.getPaymentInstruments('DW_APPLE_PAY').toArray();
            var orderPaymentInstrument = order.getPaymentInstruments().toArray().pop();
            if (!empty(customerSavedPaymentInstruments)) {
                var filterPaymentInstrument = customerSavedPaymentInstruments.filter(function (savedPaymentInstrument) {
                    return savedPaymentInstrument.custom.paymentOperatorCCNr === orderPaymentInstrument.custom.paymentOperatorCCNr;
                });
                if (!empty(filterPaymentInstrument)) {
                    isPaymentInstrumentDuplicate = true;
                }
            }
            if (!isPaymentInstrumentDuplicate) {
                Transaction.wrap(function () {
                    // Clear all prefered cards before add new one.
                    var savedPaymentInstruments = wallet.getPaymentInstruments().iterator();
                    while (savedPaymentInstruments.hasNext()) {
                        var savedPaymentInstrument = savedPaymentInstruments.next();
                        savedPaymentInstrument.custom.preferred = false;
                    }

                    var creditCardExpirationYear = orderPaymentInstrument.custom.paymentOperatorCCExpiry.substr(0, 4);
                    var creditCardExpirationMonth = orderPaymentInstrument.custom.paymentOperatorCCExpiry.substr(4, 2);

                    var storedPaymentInstrument = wallet.createPaymentInstrument(orderPaymentInstrument.METHOD_DW_APPLE_PAY);
                    storedPaymentInstrument.setCreditCardHolder(order.billingAddress.fullName);
                    storedPaymentInstrument.setCreditCardType(orderPaymentInstrument.creditCardType);
                    storedPaymentInstrument.setCreditCardNumber(orderPaymentInstrument.creditCardNumberLastDigits);
                    storedPaymentInstrument.setCreditCardExpirationMonth(Number(creditCardExpirationMonth));
                    storedPaymentInstrument.setCreditCardExpirationYear(Number(creditCardExpirationYear));
                    storedPaymentInstrument.custom.preferred = true;
                    storedPaymentInstrument.custom.paymentOperatorCCNr = orderPaymentInstrument.custom.paymentOperatorCCNr;
                    storedPaymentInstrument.custom.paymentOperatorCCBrand = orderPaymentInstrument.custom.paymentOperatorCCBrand;
                    storedPaymentInstrument.custom.paymentOperatorCCExpiry = orderPaymentInstrument.custom.paymentOperatorCCExpiry;
                    storedPaymentInstrument.custom.address1 = order.billingAddress.address1;
                    storedPaymentInstrument.custom.city = order.billingAddress.city;
                    storedPaymentInstrument.custom.phone = order.billingAddress.phone;
                    storedPaymentInstrument.custom.postalCode = order.billingAddress.postalCode;
                    storedPaymentInstrument.custom.stateCode = order.billingAddress.stateCode;
                    customer.profile.custom.defaultPaymentInstrument = storedPaymentInstrument.UUID;

                    if (HookMgr.hasHook('ordergroove.payment.update')) {
                        HookMgr.callHook('ordergroove.payment.update', 'paymentUpdate', storedPaymentInstrument);
                    }
                });
            }
        }
    }

    if (autoShip) {
        require('*/cartridge/scripts/purchasePost').orderNo(req.querystring.order_id, false, autoShip);
    }


    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    // Klaviyo include to send order confirmation event
    var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoUtils');
    KlaviyoUtils.buildDataLayer(order.orderNo);

    try {
        // Begin the transactional state.
        Transaction.begin();

        // Create the new ProductList item & set the quantity.
        var customerNo = order.getCustomerNo();
        order.custom.sfccCustomerNo = customerNo;
        // Oms related Payment method attribute
        order.custom.paymentMethod = "DW_APPLE_PAY";

            // Commit the transaction.
        Transaction.commit();
    } catch (e) {
        // Rollback any failed transactions.
        Transaction.rollback();
    }

    // TODO: Exposing a direct route to an Order, without at least encoding the orderID
    //  is a serious PII violation.  It enables looking up every customers orders, one at a
    //  time.
    res.redirect(
        URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken)
    );

    return next();
});

module.exports = server.exports();
