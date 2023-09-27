'use strict';

var server = require('server');

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var Kount = require('*/cartridge/scripts/kount/libKount');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var HookMgr = require('dw/system/HookMgr');
var Logger = require('dw/system/Logger');

var page = module.superModule;
var logMsg = '';

server.extend(page);


/**
 *  Handle Ajax payment (and billing) form submit
 */
server.append(
    'SubmitPayment',
    function (req, res, next) {
        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var BasketMgr = require('dw/order/BasketMgr');
            var currentBasket = BasketMgr.getCurrentBasket();
            var billingData = res.getViewData();

            if (billingData.storedPaymentUUID
                && req.currentCustomer.raw.authenticated
                && req.currentCustomer.raw.registered
            ) {
                var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
                var array = require('*/cartridge/scripts/util/array');
                var paymentInstrument = array.find(paymentInstruments, function (item) {
                    return billingData.storedPaymentUUID === item.UUID;
                });
                Transaction.wrap(function () {
                    currentBasket.custom.kount_KHash = paymentInstrument.raw.custom.kount_KHash || null;
                });
            }
        });
        return next();
    }
);

server.replace('PlaceOrder', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
    var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');

    var log = Logger.getLogger('paymentOperator', 'paymentOperator');
    var logPrefix = 'PAYMENTOPERATOR_PAYMENTGATE - CheckoutServices.js at' +
        ' PlaceOrder:\n';

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var CustomOrderHelpers = require(
        '*/cartridge/scripts/checkout/customOrderHelpers');
    CustomOrderHelpers.addJDEAttributesToBasket();

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message
        });
        return next();
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });
        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });
        return next();
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    if (currentBasket.totalNetPrice.value > 0) {
        var validPayment = COHelpers.validatePayment(req, currentBasket);
        if (validPayment.error) {
            res.json({
                error: true,
                errorStage: {
                    stage: 'payment',
                    step: 'paymentInstrument'
                },
                errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
            });
            return next();
        }
    }

    /** ChangeUp Injection */
    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var changeup = require('*/cartridge/scripts/changeUp/donation')(currentBasket, false);
        var supersize =  require('*/cartridge/scripts/changeUp/supersize')(changeup, currentBasket, false);

    Transaction.wrap(function () {
        var supersize_amount = '';
        if(supersize){
            var pli = null;
            pli = currentBasket.getProductLineItems('changeup-donation');
            if (pli || pli.length) {
                pli = pli[0];
            }
            supersize_amount = pli.adjustedGrossPrice.toFormattedString();
        }
        switch (changeup.config.donation_type_actor) {
            case 'customer':
                if(supersize_amount != ''){
                    currentBasket.custom.changeupDonationAmountCustomer = supersize_amount
                    currentBasket.custom.changeupAgreedToDonate = true;
                } else{
                    currentBasket.custom.changeupDonationAmountCustomer = changeup.amount;
                }
                currentBasket.custom.changeupDonationAmountMerchant = '0';
                break;
            case 'merchant':
                if(supersize_amount != ''){
                    currentBasket.custom.changeupDonationAmountCustomer = supersize_amount
                } else{
                    currentBasket.custom.changeupDonationAmountCustomer = '0';
                }
                currentBasket.custom.changeupDonationAmountMerchant = changeup.amount;
                currentBasket.custom.changeupAgreedToDonate = true;
                break;
            case 'match':
                if(supersize_amount != ''){
                    currentBasket.custom.changeupDonationAmountCustomer = supersize_amount
                    currentBasket.custom.changeupAgreedToDonate = true;
                } else{
                    currentBasket.custom.changeupDonationAmountCustomer = changeup.amount;
                }
                currentBasket.custom.changeupDonationAmountMerchant = changeup.amount;
                break;
            default:
                break;
        }
    });
}

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }
    var viewData = res.getViewData();
    viewData.orderID = order.orderNo;
    res.setViewData(viewData);

    CustomOrderHelpers.addJDEAttributesToOrder(req, res);

    var cookies = request.getHttpCookies();
    var sessionID : String = new String();
    for each(var cookie : Cookie in cookies) {
        var cookieName : String = cookie.getName();
        if(cookieName == "og_session_id") {
            sessionID = cookie.getValue();
            break;
        }
    }
    var encodedid = encodeURIComponent(sessionID);
    Transaction.wrap(function () {
        order.custom.ogsession = encodedid;
    });
    // Handle fraud detection.
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    if (fraudDetectionStatus.status === 'fail') {
        logMsg = logPrefix + '\tOrder could not be placed:\n\t';
        logMsg += 'Fraud Detection Status === fail';

        // Log the failure.
        log.info(logMsg);

        // Fail the order.
        Transaction.wrap(function () {
            OrderMgr.failOrder(order);
        });

        // Fraud detection failed.
        req.session.privacyCache.set('fraudDetectionStatus', true);
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var RISresult = Kount.preRiskCall(order, true);

    if (RISresult && RISresult.KountOrderStatus === 'DECLINED') {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order);
        });
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }
    // Handles payment authorization
    var handlePaymentResult = Kount.postRiskCall(COHelpers.handlePayments, order, true);
    if (handlePaymentResult && handlePaymentResult.KountOrderStatus === 'DECLINED') {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order);
        });
    }
    if (handlePaymentResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    if (req.currentCustomer.addressBook) {
        // save all used shipping addresses to address book of the logged in customer
        var allAddresses = addressHelpers.gatherShippingAddresses(order);
        var email = order.shipments[0].shippingAddress.custom.email;
        allAddresses.forEach(function (address) {
            if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address), email);
            }
        });
    }

    // Check if this is a computop redirect payment method.
    var PaymentOperatorRedirectHelper = require('*/cartridge/scripts/computop/util/RedirectPayment');
    var paymentOperatorUrl = PaymentOperatorRedirectHelper.getRedirectUrl(
        order,
        server.forms.getForm('billing')
    );

    if (paymentOperatorUrl) {
        // Redirect to payment page and skip standard order placement process.
        if (paymentOperatorUrl.url) {
            var continueUrl;
            if (paymentOperatorUrl.iframe) {
                continueUrl = URLUtils.https('PaymentOperator-PaymentIframe', 'target', paymentOperatorUrl.url).toString();
            } else {
                continueUrl = paymentOperatorUrl.url;
            }

            logMsg = logPrefix + '\tRedirect payment detected:\n\t';
            logMsg += 'Redirecting the user to {0} to complete transaction.';

            // Log the redirect information.
            log.info(logMsg, continueUrl);


            res.json({
                error: false,
                orderID: order.orderNo,
                orderToken: order.orderToken,
                continueUrl: continueUrl
            });
            return next();
        }
    }

    if (!Kount.isKountEnabled() || (handlePaymentResult && handlePaymentResult.KountOrderStatus === 'APPROVED')) {
        // Places the order
        var placeOrderResult = COHelpers.placeOrder(order, {});
        if (placeOrderResult.error) {
            res.json({
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
            return next();
        }
        //COHelpers.sendConfirmationEmail(order, req.locale.id);
    }

    var response = require('int_ordergroove/cartridge/scripts/purchasePost').orderNo(order.orderNo, false, true);

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    var hookmgr = require('dw/system/HookMgr');
    hookmgr.callHook('app.facebook.facebookEvents', 'sendPurchase', request, order);

    // TODO: Exposing a direct route to an Order, without at least encoding the orderID
    //  is a serious PII violation.  It enables looking up every customers orders, one at a
    //  time.
    res.json({
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('Order-Confirm').toString()
    });

    return next();
});

module.exports = server.exports();
