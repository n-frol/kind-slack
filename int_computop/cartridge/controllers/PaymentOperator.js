/* eslint-disable no-multi-spaces */
'use strict';
/**
 * Description of the Controller and the logic it provides
 *
 * @module controllers/PaymentOperator
 */

// SFCC API Includes
var URLUtils    = require('dw/web/URLUtils');
var HookMgr = require('dw/system/HookMgr');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger');

// Module level declarations
var cdpmLogger = Logger.getLogger('paymentOperator', 'paymentOperator');
var logPrefix = 'PAYMENTOPERATOR_PAYGATE - PaymentOperator.js:\n\t';

// SFRA module includes
var server = require('server');

/**
 * Try to cancel an order
 *
 * @param {string} orderId - current order orderNo
 * @param {string} logMessage - specific log message
 * @returns {Object} - with error messages + cancellation status
 */
function cancelOrder(orderId, logMessage) {
    // SFCC API includes
    var OrderMgr = require('dw/order/OrderMgr');
    var Status = require('dw/system/Status');
    var Transaction = require('dw/system/Transaction');

    var result = { errors: [], status: '' };
    var logMsg = logPrefix + 'ERROR at cancelOrder():';

    if (typeof logMessage === 'undefined') {
        // eslint-disable-next-line no-param-reassign
        logMessage = 'confirm.error.technical';
    }

    if (!orderId) {
        result.errors.push('OrderNo is missing!');
        result.status = new Status(Status.ERROR, 'OrderNo is Missing!');

        return result;
    }

    try {
        // cancel order
        var order = OrderMgr.getOrder(orderId);
        if (!order) {
            result.errors.push('No order found for orderNo!');
            return result;
        }
        Transaction.wrap(function () {
            OrderMgr.failOrder(order);
        });
    } catch (e) {
        logMsg += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();

        cdpmLogger.error(logMsg);
        result.status = new Status(Status.ERROR, logMessage);
    }
    result.status = new Status(Status.OK, logMessage);

    return result;
}

/**
 * Renders express buttons in cart per remote include
 */
server.get(
    'ExpressButtons',
    server.middleware.include,
    function (req, res, next) {
        var ArrayList = require('dw/util/ArrayList');
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();

        var expressMethods = new ArrayList();
        if (currentBasket !== null) {
            var money = currentBasket.totalGrossPrice;
            var amount = money.available ? money.value : null;

            var currentLocale = (req.locale === 'default') ? {} : req.locale;
            var countryCode = 'de';
            // TODO better define fallback in preferences
            if (Object.prototype.hasOwnProperty.call(currentLocale, 'id')) {
                countryCode = currentLocale.id.substring(currentLocale.id.length - 2, currentLocale.id.length);
            }

            var paymentOperatorHelper = require('*/cartridge/scripts/computop/util/Checkout');
            var PaymentMgr = require('dw/order/PaymentMgr');
            var methods = PaymentMgr.getApplicablePaymentMethods(req.currentCustomer.raw, countryCode, amount).toArray();
            expressMethods = methods.filter(function (method) {
                return paymentOperatorHelper.EXPRESS_PAYMENT_METHODS.indexOf(method.ID) !== -1;
            });
        }
        res.render(
            '/cart/paymentoperator/expressbuttons',
            {
                expressMethods: expressMethods,
                locale: req.locale.id
            }
        );
        next();
    }
);

/**
 * Handles re-entry from Paygate, redirects to PaymentOperator-RedirectSuccess
 */
server.get(
    'Success',
    server.middleware.https,
    function (req, res, next) {
        var params = req.querystring;
        if (params.Data) {
            res.render('checkout/paymentoperator_redirect', {
                PaymentOperatorUrl: URLUtils.https('PaymentOperator-RedirectSuccess', 'Data', params.Data, 'Len', params.Len)
            });
        } else {
            res.render('checkout/empty');
        }
        next();
    }
);

/**
 * success call for redirect payments
 */
server.get(
    'RedirectSuccess',
    server.middleware.https,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var OrderMgr = require('dw/order/OrderMgr');
        var Site = require('dw/system/Site').getCurrent();
        var Transaction = require('dw/system/Transaction');
        var currentBasket = BasketMgr.getCurrentBasket();
        var logMsg = '';
        logPrefix += 'Endpoint Called: PaymentOperator-RedirectSuccess\n\t';

        // Log the encrypted response.
        cdpmLogger.info(logPrefix + 'Paymentoperator ENCRYPTED response: ' +
            req.querystring);

        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define

        var orderId;
        try {
            orderId = paymentOperatorStatus.get('UserData');
        } catch (e) {
            logMsg = Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            cdpmLogger.error(logPrefix + logMsg);
            orderId = null;
        }

        if (!paymentOperatorStatus) {
            // Log the failure.
            logMsg = logPrefix + 'Cancelling Order #: {0}\n\t' +
                'Unable to get paymentOperatorStatus object.';
            cdpmLogger.error(logMsg, orderId);

            // Cancel the order.
            cancelOrder(orderId);
            // TODO show meaningful error message
            req.session.privacyCache.set('paymentOperatorError', Resource.msg('paymentoperator.error.details.default', 'paymentoperator', null));
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        var order;
        try {
            order = OrderMgr.getOrder(orderId);
        } catch (err) {
            cdpmLogger.error('Error while trying to load order - '
                + err.fileName + ': ' + err.message + '\n' + err.stack);
        }

        if (!order) {
            // Log the failure.
            logMsg = logPrefix + 'Cancelling Order #: {0}\n\t' +
                'Order not found in system.';
            cdpmLogger.error(logMsg, orderId);

            // Cancel the order.
            cancelOrder(orderId);
            // TODO show meaningful error message
            req.session.privacyCache.set('paymentOperatorError', Resource.msg('paymentoperator.error.details.default', 'paymentoperator', null));
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // No order placement for PayU with specific status 'AUTHORIZE_REQUEST'
        // The order placement will be processed through notify call in this case
        if (paymentOperatorStatus.hasOwnProperty('Status')
            && paymentOperatorStatus.get('Status').equals('AUTHORIZE_REQUEST')
            && !(order.getPaymentInstruments('PAYMENTOPERATOR_PAYU').isEmpty())
        ) {
            res.redirect(URLUtils.https('Order-Confirm', 'ID', orderId, 'token', order.orderToken));
            return next();
        }

        // MasterPass transaction step
        if (paymentOperatorStatus.hasOwnProperty('masterpassid')
            && paymentOperatorStatus.get('masterpassid')
        ) {
            var masterPassTransactionPayment = require('~/cartridge/scripts/computop/util/MasterPassTransactionPayment');
            if (!masterPassTransactionPayment.callService(paymentOperatorStatus, order)) {
                // Log the failure
                logMsg = logPrefix + 'Cancelling Order #: {0}\n\t' +
                    'ERROR calling service for MasterPass payment method.';
                cdpmLogger.warn(logMsg, order.orderNo);

                // Cancel the order.
                cancelOrder(order.getOrderNo());
                // TODO show meaningful error message
                req.session.privacyCache.set('paymentOperatorError', Resource.msg('paymentoperator.error.details.default', 'paymentoperator', null));
                res.redirect(URLUtils.https('Cart-Show'));
                return next();
            }
        }

        require('~/cartridge/scripts/computop/util/SavePaymentOperatorData').savePaymentOperatorResponse(order, paymentOperatorStatus);

        // set payment status
        if (((paymentOperatorStatus.hasOwnProperty('SecCriteria') && paymentOperatorStatus.get('SecCriteria').equals('1')
                || paymentOperatorStatus.hasOwnProperty('seccriteria') && paymentOperatorStatus.get('seccriteria').equals('1'))
                && !(order.getPaymentInstruments('PAYMENTOPERATOR_ONLINE_TRANSFER').isEmpty())
              ) || (Site.getCustomPreferenceValue('paymentOperatorPaypalCaptureType') == 'auto'
                && paymentOperatorStatus.hasOwnProperty('Status')
                && paymentOperatorStatus.get('Status').equals('OK')
                && !(order.getPaymentInstruments('PAYMENTOPERATOR_PAYPAL').isEmpty())
              ) || (paymentOperatorStatus.hasOwnProperty('Code')
                  && paymentOperatorStatus.get('Code').equals('00000000')
                && !(order.getPaymentInstruments('PAYMENTOPERATOR_IDEAL').isEmpty())
              )
        ) {
            Transaction.wrap(function () {
                order.setPaymentStatus(order.PAYMENT_STATUS_PAID);
            });

            // Log the change of order status.
            cdpmLogger.info(logPrefix += 'Status for order #: {0} was set to:' +
                'PAYMENT_STATUS_PAID', order.orderNo);
        }

        var fraudDetectionStatus = HookMgr.callHook(
            'app.fraud.detection',
            'fraudDetection',
            currentBasket
        );

        if (fraudDetectionStatus.status === 'fail') {
            // Log the failure
            logMsg = logPrefix + 'Cancelling Order #: {0}\n\t' +
                'Fraud Detection Status was: fail';
            cdpmLogger.warn(logMsg, order.orderNo);

            Transaction.wrap(function () { OrderMgr.failOrder(order); });

            // fraud detection failed
            req.session.privacyCache.set('fraudDetectionStatus', true);
            res.redirect(URLUtils.https('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode));

            return next();
        }

        // Places the order
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
        if (placeOrderResult.error) {
            // Log the failure
            logMsg = logPrefix + 'Cancelling Order #: {0}\n\t' +
                'Unable to get paymentOperatorStatus object.';
            cdpmLogger.error(logMsg);

            // Cancel the order.
            cancelOrder(order.getOrderNo());
            // TODO append ErrorCode action + define error messages
            req.session.privacyCache.set('paymentOperatorError', Resource.msg('paymentoperator.error.details.default', 'paymentoperator', null));
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        //COHelpers.sendConfirmationEmail(order, order.customerLocaleID);

        // Reset usingMultiShip after successful Order placement
        req.session.privacyCache.set('usingMultiShipping', false);

        res.redirect(
            URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken)
        );
        return next();
    }
);

/**
 * failure call for redirect payments
 */
server.get(
    'Failure',
    server.middleware.https,
    function (req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');
        var logMessage = null;
        var order;


        // Log the encrypted response if it is there.
        logPrefix += 'Endpoint Called: PaymentOperator-Failure\n\t';
        cdpmLogger.info(logPrefix + 'PaymentOperator Failure Response: ' +
            req.querystring);

        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define

        // If a decrypted response is available, log it as well.
        if (paymentOperatorStatus) {
            var logStatus = require('~/cartridge/scripts/computop/util/LogError').logError(
                paymentOperatorStatus,
                'PaygateError'
            );

            if (logStatus.LogMessage) {
                logMessage = logStatus.LogMessage;
            }
        }

        // Attempt to get the order from the UUID or the order #.
        if (paymentOperatorStatus.get('UserData')) {
            order = OrderMgr.getOrder(paymentOperatorStatus.get('UserData'));
        } else if (paymentOperatorStatus.get('TransID')) {
            order = OrderMgr.queryOrder('UUID = {0}', paymentOperatorStatus.get('TransID'));
        }

        if (order) {
            // Log the order fail.
            cdpmLogger.info(logPrefix + 'Canceling Order #: {0} ' +
                req.querystring, order.orderNo);

            // Cancel the order.
            cancelOrder(order, logMessage);
        } else {
            cdpmLogger.warn(logPrefix + 'No order found to cancel');
        }

        // TODO add useful error message to session for display on order summary step
        req.session.privacyCache.set(
            'paymentOperatorError',
            Resource.msg('error.technical', 'checkout', null)
        );

        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
        next();
    }
);

/**
 * notify call for redirect payments
 */
server.use(
    'Notify',
    server.middleware.https,
    function (req, res, next) {
        var Order = require('dw/order/Order');
        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');

        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define

        if (!paymentOperatorStatus) {
            res.render('checkout/empty');
            return next();
        }

        var orderId = paymentOperatorStatus.get('UserData');
        var order = OrderMgr.getOrder(orderId);

        if (!order) {
            res.render('checkout/empty');
            return next();
        }

        // set payment status
        if ((paymentOperatorStatus.hasOwnProperty('SecCriteria')
            && paymentOperatorStatus.get('SecCriteria').equals('1')
            || paymentOperatorStatus.hasOwnProperty('seccriteria') && paymentOperatorStatus.get('seccriteria').equals('1'))
            && !(order.getPaymentInstruments('PAYMENTOPERATOR_ONLINE_TRANSFER').isEmpty())
        ) {
            Transaction.wrap(function () {
                order.setPaymentStatus(order.PAYMENT_STATUS_PAID);
            });
        }

        // PayU Handling
        var orderStatus = order.status.value;
        var payUChannel = getSitePreference('paymentOperatorPayUChannel');
        if (payUChannel && payUChannel.value) {
            payUChannel = payUChannel.value;
        } else {
            payUChannel = '';
        }

        if (orderStatus === Order.ORDER_STATUS_CREATED
            && payUChannel.equals('TR')
            && !(order.getPaymentInstruments('PAYMENTOPERATOR_PAYU').isEmpty())
        ) {
            // save possible payU error data into order
            Transaction.wrap(function () {
                order.custom.paymentOperatorPayUErrorText = paymentOperatorStatus.get('ErrorText');
                order.custom.paymentOperatorPayUCodeExt = paymentOperatorStatus.get('CodeExt');
            });
            // save general response data and submit order
            if (paymentOperatorStatus.hasOwnProperty('Status')
                && paymentOperatorStatus.get('Status').equals('OK')
            ) {
                require('~/cartridge/scripts/computop/util/SavePaymentOperatorData').savePaymentOperatorResponse(order, paymentOperatorStatus);
                var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
                var orderPlacementStatus = COHelpers.placeOrder(order);
                if (!orderPlacementStatus.error) {
                    // FIXME check if clearance of forms is required for notify
                }
            }
        }

        res.render('checkout/empty');
        return next();
    }
);

/**
 * Return call after Credit Direct 3D Secure redirect
 */
server.get(
    'TermUrl',
    server.middleware.https,
    function (req, res, next) {
        var params = req.querystring;
        if (!params.MID || !params.PayID || !params.TransID || !params.PaRes) {
            cdpmLogger.error('Missing parameter in TermUrl call!');
            // FIXME show customer helpful error message
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('paymentoperator.error.details.default', 'paymentoperatorerrordetails', null)
            );
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // Parse response
        var merchantId = params.MID;
        var paymentId = params.PayID;
        var transactionId = params.TransID;
        var paResponse = params.PaRes;

        var OrderMgr = require('dw/order/OrderMgr');

        // retrieve order data from session
        var sessionDataConversion = require('~/cartridge/scripts/computop/util/SessionDataConversion');
        var orderData = sessionDataConversion.getOrderCreditDirect3DDataFromSession(transactionId);

        // check order
        var order;
        try {
            if (orderData) {
                order = OrderMgr.getOrder(orderData.order_id);
            }
        } catch (err) {
            cdpmLogger.error('Error while trying to load order - ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        if (!order) {
            // FIXME show customer helpful error message
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('paymentoperator.error.details.default', 'paymentoperatorerrordetails', null)
            );
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }
        if (!orderData.order_token.equals(order.getOrderToken())) {
            cancelOrder(orderData.order_id);
            // FIXME show customer helpful error message
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('paymentoperator.error.details.default', 'paymentoperatorerrordetails', null)
            );
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // call service
        var creditDirect3DPayment = require('~/cartridge/scripts/computop/util/CreditDirect3DPayment');
        var parameterMap = creditDirect3DPayment.create3DParameterMap(merchantId, paymentId, transactionId, paResponse, orderData);
        if (!creditDirect3DPayment.callService(parameterMap, order)) {
            cancelOrder(orderData.order_id);
            // FIXME show customer helpful error message
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('paymentoperator.error.details.default', 'paymentoperatorerrordetails', null)
            );
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        var BasketMgr = require('dw/order/BasketMgr');
        var Transaction = require('dw/system/Transaction');
        var currentBasket = BasketMgr.getCurrentBasket();

        var fraudDetectionStatus = HookMgr.callHook(
            'app.fraud.detection',
            'fraudDetection',
            currentBasket
        );
        if (fraudDetectionStatus.status === 'fail') {
            Transaction.wrap(function () { OrderMgr.failOrder(order); });

            // fraud detection failed
            req.session.privacyCache.set('fraudDetectionStatus', true);
            res.redirect(URLUtils.https('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode));

            return next();
        }
        // Places the order
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
        if (placeOrderResult.error) {
            cancelOrder(order.getOrderNo());
            // TODO append ErrorCode action + define error messages
            req.session.privacyCache.set('paymentOperatorError', Resource.msg('paymentoperator.error.details.default', 'paymentoperator', null));
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        COHelpers.sendConfirmationEmail(order, order.customerLocaleID);

        // Reset usingMultiShip after successful Order placement
        req.session.privacyCache.set('usingMultiShipping', false);

        res.redirect(
            URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken)
        );
        next();
    }
);

/**
 * Perform a redirect to PayPal from cart for PaypaExpress address retrieving
 */
server.get(
    'PaypalExpress',
    server.middleware.https,
    function (req, res, next) {
        // SFCC API imports
        var BasketMgr = require('dw/order/BasketMgr');
        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');

        // Script imports
        var PayPalHelpers = require(
            '*/cartridge/scripts/computop/helpers/PayPalHelpers');
        var redirectPayment = require(
            '~/cartridge/scripts/computop/util/RedirectPayment');
        var profile = session.customerAuthenticated &&
            !empty(session.customer.profile) ? session.customer.profile : null;
        var addressBook = !empty(profile) &&
            !empty(profile.addressBook) &&
            !profile.addressBook.addresses.empty ?
            profile.addressBook : null;
        var ppPi = PayPalHelpers.getPayPalCustomerPI();
        var basket = BasketMgr.getCurrentBasket();
        var PAYPAL_PAYMENT_METHOD = 'PAYMENTOPERATOR_PAYPAL';
        var logMsg = '';
        var address;

        // Log prefix for endpoint logging.
        logPrefix += 'Endpoint Called: PaymentOperator-PaypalExpress\n\t';

        if (basket && basket.getProductLineItems().size()) {
            var orderNo = OrderMgr.createOrderNo();
            var basketPIs = basket.getPaymentInstruments();

            // Log the new Order #.
            cdpmLogger.info(logPrefix +
                'Order # created for PayPal Express transaction: {0}',
                orderNo
            );

            // Check for existing PP billing agreement in customer's wallet.
            if (!empty(addressBook) && !empty(ppPi)) {
                // Log that an existing billing agreement will be used.
                logMsg = logPrefix + 'Existing PayPal billing agreement ' +
                    'found for customer: {0}\n\t' +
                    'Billing Agreement ID: {1} will be used for payment of' +
                    'Order #: {2}' ;
                cdpmLogger.info(logMsg, session.customer.ID, ppPi, orderNo);

                // Attempt to find an address for processing payment.
                var prefAddress = addressBook.getPreferredAddress();
                address = !empty(prefAddress) && !empty(addressBook) ?
                        prefAddress : addressBook.addresses.get(0);

                // Validate the basket.
                var validationBasketStatus = HookMgr.callHook(
                    'app.validate.basket',
                    'validateBasket',
                    basket,
                    false
                );

                // If the basket is not valid redirect to show an error message.
                if (validationBasketStatus.error) {
                    // Log the failure.
                    logMsg = logPrefix +
                        'Unable to process PayPal Express Order #: {0}\n\t' +
                        'Error Message: {1}';
                    cdpmLogger.info(logMsg, orderNo,
                        validationBasketStatus.message);

                    res.json({
                        error: true,
                        errorMessage: validationBasketStatus.message
                    });
                    return next();
                }

                // Set the addresses for the order.
                if (!PayPalHelpers.setOrderAddresses(address)) {
                    // Log the failure.
                    logMsg = logPrefix +
                        'Unable to process PayPal Express Order #: {0}\n\t' +
                        'Error Message: Unable to set the order address';
                    cdpmLogger.info(logMsg, orderNo);

                    // Set the session variable for the PP fail.
                    req.session.privacyCache.set('paymentOperatorError',
                        Resource.msg('paypalexpress.error',
                            'paymentoperator', null));
                    res.redirect(URLUtils.https('Cart-Show'));
                    return next();
                }

                // Calculate the basket taxes.
                Transaction.wrap(function () {
                    if (HookMgr.hasHook('vertex.basket.taxes')) {
                        HookMgr.callHook('vertex.basket.taxes',
                        'calculateTaxes', basket);
                    } else {
                        HookMgr.callHook('dw.order.calculateTax',
                            'calculateTax', basket);
                    }
                });

                // Update basket totals.
                basket.updateTotals();

                try {

                    // Remove any existing payment instruments from the basket &
                    // create the PayPal payment instrument.
                    Transaction.wrap(function () {
                        if (!basketPIs.empty) {
                            basket.removeAllPaymentInstruments();
                        }

                        var pi = basket.createPaymentInstrument(
                            PAYPAL_PAYMENT_METHOD, basket.totalGrossPrice);
                        pi.setCreditCardType('PayPal');
                    });
                } catch (e) {
                    var errMsg = logPrefix +
                        'Unable to create PayPal payment method.';

                    // Log each property of the error.
                    Object.keys(e).forEach(function (key) {
                        errMsg += '\n\t' + key + ': ' + e[key];
                    });
                    cdpmLogger.error(errMsg);

                    // Set the paymentoperator error in the session variable.
                    req.session.privacyCache.set('paymentOperatorError',
                        Resource.msg('paypalexpress.error',
                            'paymentoperator', null));

                    // Redirect to the Cart
                    res.redirect(URLUtils.https('Cart-Show'));
                    return next();
                }

                // Log the success/redirect of the billing agreement payment.
                logMsg = 'Successfully setup PayPal Express payment from an ' +
                    'existing billing agreement. Redirecting to Place Order ' +
                    'stage of the checkout';
                cdpmLogger.info(logMsg);

                // Redirect to the checkout.
                res.redirect(URLUtils.https(
                    'Checkout-Begin', 'stage', 'placeOrder', 'ppRefTrans', true
                ));
                return next();

            } else {
                // Standard PayPal Express Flow
                var paymentOperatorUrl = redirectPayment
                    .getPaypalExpressRedirectUrl(basket,
                        orderNo, req.session);
                if (paymentOperatorUrl && Object.prototype.hasOwnProperty.call(
                    paymentOperatorUrl, 'url')
                ) {
                    // Log the success / redirect.
                    logMsg = logPrefix + 'Success setting up PayPal Express.\n\t';
                    logMsg += 'Redirecting customer to PayPal site.';
                    cdpmLogger.info(logMsg);

                    res.redirect(paymentOperatorUrl.url);
                } else {
                    // Log the failure.
                    logMsg = logPrefix + 'ERROR setting up PayPal Express.\n\t';
                    logMsg += 'No redirect URL found.';
                    cdpmLogger.warn(logMsg);

                    req.session.privacyCache.set('paymentOperatorError',
                        Resource.msg('paypalexpress.error',
                            'paymentoperator', null));
                    res.redirect(URLUtils.https('Cart-Show'));
                }
            }
        } else {
            // Log the failure.
            logMsg = logPrefix + 'ERROR setting up PayPal Express.\n\t';
            logMsg += 'Basket is empty!';
            cdpmLogger.warn(logMsg);

            // If basket is empty, redirect to the cart page and display error.
            req.session.privacyCache.set('paymentOperatorError',
            Resource.msg('paypalexpress.error',
                'paymentoperator', null));
            res.redirect(URLUtils.https('Cart-Show'));
        }

        return next();
    }
);

/**
 * Return from PaypalExpress adress step
 */
server.get(
    'SuccessPaypalExpress',
     server.middleware.https,
    function (req, res, next) {
        var Transaction = require('dw/system/Transaction');
        var paymentOperatorHelper = require('*/cartridge/scripts/computop/util/Checkout');
        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define
        logPrefix += 'Endpoint Called: PaymentOperator-SuccessPaypalExpress\n\t';

        // checking response
        if (!paymentOperatorStatus) {
            // Log the failure
            cdpmLogger.error(logPrefix + 'ERROR: No response data!');

            // Redirect to cart
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // checking cart
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket || !currentBasket.getProductLineItems().size()) {
            // Log the failure
            cdpmLogger.error(logPrefix + 'ERROR: Empty Basket!');

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // create payment instrument
        var popStatus = paymentOperatorHelper
            .removePaymentOperatorInstrumentsFromBasket();
        if (!popStatus) {
            // Log the failure
            cdpmLogger.error(logPrefix + 'ERROR removing payment instruments.');

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        Transaction.wrap(function () {
            currentBasket.createPaymentInstrument(
                'PAYMENTOPERATOR_PAYPALEXPRESS',
                currentBasket.totalGrossPrice
            );
        });

        // create basket addresses
        if (!require('*/cartridge/scripts/computop/util/AddressConversion')
            .createBasketAddressesFromPaypalExpress(currentBasket, paymentOperatorStatus)
        ) {
            // Log the failure
            cdpmLogger.error(logPrefix + 'Could not create basket address ' +
                'from response data!');

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // save data to session
        if (!require('*/cartridge/scripts/computop/util/SessionDataConversion')
            .storePaypalExpressDataInSession(paymentOperatorStatus)
        ) {
            // Log the failure
            cdpmLogger.error(logPrefix + 'Error storing PayPal Express data ' +
                'to the session.');

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // Log success.
        cdpmLogger.info(logPrefix + 'Successfully mapped response data from ' +
            'PayPal Express redirect');

        res.redirect(URLUtils.https('Checkout-Begin'));
        return next();
    }
);

/**
 * PaypalExpress failure: i.e. customer cancellation
 */
server.get(
    'FailureExpress',
    function (req, res, next) {
        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define

        if (paymentOperatorStatus) {
            var errorMessage = require('~/cartridge/scripts/computop/util/LogError').logError(
                paymentOperatorStatus,
                'PaygateError'
            );

            req.session.privacyCache.set('paymentOperatorError', errorMessage.LogMessage);
        }

        res.redirect(URLUtils.https('Cart-Show'));
        return next();
    }
);

server.get(
    'MasterpassQuickCheckout',
    server.middleware.https,
    function (req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();

        if (currentBasket) {
            var orderNo = OrderMgr.createOrderNo();

            var redirectPayment = require('~/cartridge/scripts/computop/util/RedirectPayment');
            var paymentOperatorUrl = redirectPayment.getMasterPassQuickCheckoutRedirectUrl(
                currentBasket,
                orderNo,
                req.session
            );
            if (paymentOperatorUrl && Object.prototype.hasOwnProperty.call(paymentOperatorUrl, 'url')) {
                res.redirect(paymentOperatorUrl.url);
            } else {
                req.session.privacyCache.set('paymentOperatorError', Resource.msg('masterpassquickcheckout.error', 'paymentoperator', null));
                res.redirect(URLUtils.https('Cart-Show'));
            }
        }
        return next();
    }
);

/**
 * Return from MasterPassQuickCheckout address step
 */
server.get(
    'SuccessMasterPassQuickCheckout',
    server.middleware.https,
    function (req, res, next) {
        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define

        // checking response
        if (!paymentOperatorStatus) {
            cdpmLogger.error('No response data!');
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // checking cart
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket || !currentBasket.getProductLineItems().size()) {
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // create payment instrument
        var paymentOperatorHelper = require('*/cartridge/scripts/computop/util/Checkout');
        var popStatus = paymentOperatorHelper.removePaymentOperatorInstrumentsFromBasket();
        if (!popStatus) {
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }
        require('dw/system/Transaction').wrap(function () {
            currentBasket.createPaymentInstrument(
                'PAYMENTOPERATOR_MASTERPASS_QUICKCHECKOUT',
                currentBasket.totalGrossPrice
            );
        });

        // create basket addresses
        if (!require('~/cartridge/scripts/computop/util/AddressConversion').createBasketAddressesFromMasterPassQuickCheckout(currentBasket, paymentOperatorStatus)) {
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // save data to session
        if (!require('~/cartridge/scripts/computop/util/SessionDataConversion').storeMasterPassQuickCheckoutDataInSession(paymentOperatorStatus)) {
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        res.redirect(URLUtils.https('Checkout-Begin'));
        return next();
    }
);

/**
 * Back with success from easy credit
 */
server.get(
    'SuccessEasyCredit',
    server.middleware.https,
    function (req, res, next) {

        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define
        // check response
        if (!paymentOperatorStatus) {
            cdpmLogger.error('No response data!');
            // TODO display USEFUL error message to customer
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null)
            );

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // check cart
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket || !currentBasket.getProductLineItems().size()) {
            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // Validate TransID from session
        var sessionTransID = req.session.privacyCache.get('easyCreditTransId');
        if (sessionTransID !== paymentOperatorStatus.get('TransID')) {
            cdpmLogger.error('easyCreditTransId - not ok: session[' + sessionTransID + '] response=[' + paymentOperatorStatus.get('TransID') + ']');
            // TODO display USEFUL error message to customer
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null)
            );

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // GET Step
        var easyCreditPayment = require('~/cartridge/scripts/computop/util/EasyCreditPayment');
        var parameterMap = easyCreditPayment.createGetParameterMap(
            paymentOperatorStatus.get('UserData'), // OrderNo
            paymentOperatorStatus.get('PayID'),
            paymentOperatorStatus.get('TransID')
        );

        // calling GET service and create the payment instrument
        var getEasyCreditResult = easyCreditPayment.callGetService(parameterMap, currentBasket);
        if (getEasyCreditResult.error === true) {
            cdpmLogger.error(getEasyCreditResult.msg);
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('easycredit.service.failed', 'paymentoperator', null)
            );

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // save data to session
        if (!require('~/cartridge/scripts/computop/util/SessionDataConversion').storeEasyCreditDataInSession(paymentOperatorStatus, currentBasket)) {
            // TODO display USEFUL error message to customer
            req.session.privacyCache.set(
                'paymentOperatorError',
                Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null)
            );

            res.redirect(URLUtils.https('Cart-Show'));
            return next();
        }

        // remove first step session parameter after second step was successful
        req.session.privacyCache.set('easyCreditTransId', false);

        // Jump to the next checkout step.
        req.session.privacyCache.set('EasyCreditTerm', getEasyCreditResult.term);
        req.session.privacyCache.set('EasyCreditRepaymentText', getEasyCreditResult.repaymentText);
        req.session.privacyCache.set('EasyCreditUrlPrecontractInformation', getEasyCreditResult.urlPrecontractInformation);

        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder'));
        return next();
    }
);

/**
 * Transaction failed with easy credit / customer cancellation
 */
server.get(
    'FailureEasyCredit',
    server.middleware.https,
    function (req, res, next) {
        var paymentOperatorStatus = getResponseParams(req.querystring); // eslint-disable-line no-use-before-define

        if (paymentOperatorStatus) {
            require('~/cartridge/scripts/computop/util/LogError').logError(
                paymentOperatorStatus,
                'PaygateError'
            );
        }

        // TODO display USEFUL error message to customer
        req.session.privacyCache.set(
            'paymentOperatorError',
            Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null)
        );

        res.redirect(URLUtils.https('Cart-Show'));
        next();
    }
);

/**
 * Get param "data" from incoming request from paygate
 *
 * @param {dw.util.HashMap} params - response data from paygate
 * @returns {boolean|Object} - paygate response as hashmap or false in case of error
 */
function getResponseParams(params) {
    var HashMap = require('dw/util/HashMap');

    if (!params.Data) {
        // FIXME this is only relevant for easycredit - TESTING
        if (params.TransID && getSitePreference('paymentOperatorProcessUnencryptedResponse')) {
            cdpmLogger.info('Missing Data parameter in return URL, but TransID found. Trying to use unencrypted parameters. Query string is: ' + params);
            var directMap = new HashMap();
            for (var key in Object.keys(params)) {
                directMap.put(key, params[key]);
            }
            return directMap;
        } else {
            return false;
        }
    }

    var redirectPayment = require('~/cartridge/scripts/computop/util/RedirectPayment');
    var parseResult = redirectPayment.parseURLString(
        params.Data,
        true
    );

    if (parseResult.ParameterMap) {
        return parseResult.ParameterMap;
    }

    return false;
}

/**
 * Returns key specified site preference.
 *
 * @param {string} key - custom site preference key
 * @returns {string}
 */
function getSitePreference(key) {
    var Site = require('dw/system/Site').getCurrent();
    var result = Site.getCustomPreferenceValue(key);
    if (!result) {
        result = '';
    }
    return result;
}

/**
 * creating device ID (PayMorrow) - ajax
 */
server.get(
    'PaymorrowDeviceID',
    server.middleware.https,
    function(req, res, next) {
        var UUIDUtils = require('dw/util/UUIDUtils');
        var deviceID = UUIDUtils.createUUID();
        req.session.privacyCache.set('paygateDeviceID', deviceID);

        res.json({ deviceid: deviceID });
        next();
    }
);

/**
 * Show paymentoperator iframe
 */
server.get(
    'PaymentIframe',
    server.middleware.https,
    function (req, res, next) {
        var iframeUrl = req.querystring.target;
        if (!iframeUrl) {
            var System = require('dw/system/System');
            var showError = [System.PRODUCTION_SYSTEM, System.STAGING_SYSTEM].indexOf(System.instanceType) === -1;

            res.setStatusCode(404);
            res.render('error', {
                error: req.error || {},
                showError: showError,
                message: Resource.msg('iframe.unauthorized.access', 'paymentoperator', null)
            });
            return next();
        }

        res.render('checkout/paymentoperator_frame', { PaymentOperatorUrl: iframeUrl });
        return next();
    }
);

/**
 * Debug transfer objects
 *
 * Possible request params:
 *  - method String PaymentOperator payment method name / id e.g. PAYMENTOPERATOR_PAYMORROW_INVOICE *required*
 *  - methodSuffix String Suffix for transfer object class e.g. _Init
 *  - action String tbd
 *  - orderNo String If provided transfer object will be created for this order otherwise for current cart
 *
 * e.g. PaymentOperator-DebugTransferObject?method=PAYMENTOPERATOR_PAYMORROW_INVOICE&methodSuffix=_Init
 * PaymentOperator-DebugTransferObject?method=PAYMENTOPERATOR_ONLINE_TRANSFER&orderNo=00008602
 *
 */
server.get(
    'DebugTransferObject',
    server.middleware.https,
    function (req, res, next) {
        var result = {};
        var BasketMgr = require('dw/order/BasketMgr');
        var OrderMgr = require('dw/order/OrderMgr');

        // use only on test environment
        var System = require('dw/system/System');
        if ([System.PRODUCTION_SYSTEM, System.STAGING_SYSTEM].indexOf(System.instanceType) !== -1) {
            res.setStatusCode(404);
            res.render('error');
            return next();
        }
        var params = req.querystring;

        // load order if orderNo is provided as GET-param
        var order = OrderMgr.getOrder(params.orderNo);
        var paymentMethodID = params.method;
        var lineitemcnt;

        if (false === /^PAYMENTOPERATOR_/.test(paymentMethodID)) {
            paymentMethodID = 'PAYMENTOPERATOR_' + paymentMethodID;
        }


        if (order) {
            var paymentInstruments = order.paymentInstruments.iterator();
            while (paymentInstruments.hasNext()) {
                var instrument = paymentInstruments.next();
                if (instrument.getPaymentMethod().indexOf('PAYMENTOPERATOR', 0) > -1) {
                    paymentMethodID = instrument.getPaymentMethod();
                }
            }
            lineitemcnt = order;
        } else {
            // fallback to cart
            lineitemcnt = BasketMgr.getCurrentBasket();
        }


        if (lineitemcnt && paymentMethodID) {
            var transferObjectBasePath = '~/cartridge/scripts/computop/transferobjects/';
            var transferObjectClass;

            // in some cases transfer object name comes as param
            if (params.transferObject) {
                transferObjectClass = transferObjectBasePath + params.transferObject.trim();
            } else {
                transferObjectClass = transferObjectBasePath + paymentMethodID.trim();
            }

            var methodSuffix = params.methodSuffix ? params.methodSuffix.trim() : null;
            if (['PAYMENTOPERATOR_PAYMORROW_SDD', 'PAYMENTOPERATOR_PAYMORROW_INVOICE'].indexOf(paymentMethodID) > -1
                && methodSuffix
            ) {
                transferObjectClass += /^_/.test(methodSuffix) ? '' : '_'
                    + methodSuffix;
            }

            // load transfer object
            var transferObject = require(transferObjectClass);
            result.transferObjectClass = transferObjectClass;

            // set payment form data to transfer object
            // FIXME this will not work for all methods as e.g. credit-direct possibly sets data from stored payment instruments
            var billingForm = server.forms.getForm('billing');
            transferObject.setPaymentInformation(billingForm);


            var paymentinstruments = lineitemcnt.getPaymentInstruments(paymentMethodID);
            var paymentinstrument = paymentinstruments.length ? paymentinstruments[0] : {};

            transferObject
                .setLineItemCtnr(lineitemcnt)
                .setCustomer(req.currentCustomer.profile ? req.currentCustomer.profile : null)
                .setLogging(false);

            if (['PAYMENTOPERATOR_PAYMORROW_SDD', 'PAYMENTOPERATOR_PAYMORROW_INVOICE'].indexOf(paymentMethodID) > -1) {
                var eventtoken = params.action && params.action == 'REINIT' ? '11' : '10' ;

                transferObject.setEventToken(eventtoken)
                    .setPaymentInstrument(paymentinstrument);
            }

            var requestParams = transferObject.getTransferObject();
            var mapKeys = requestParams.keySet().iterator();

            while (mapKeys.hasNext()) {
                var key = mapKeys.next();
                if ('BrowserHeader' === key) {
                    continue;
                }
                result[key] = requestParams.get(key);
            }
        }
        res.json(result);
        return next();
    }
);

module.exports = server.exports();
