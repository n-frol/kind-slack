/* global session */

'use strict';

// SFCC API includes
var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var HTTPClient = require('dw/net/HTTPClient');

// SFRA Includes
var server = require('server');
var customShippingHelpers = require('*/cartridge/scripts/checkout/customShippingHelpers');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

server.extend(module.superModule);

/**
 * Appends the base functionality by adding shipment gift information in the
 * view data.
 */
server.append('Get', function (req, res, next) {
    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var viewData = res.getViewData();
    var currentCustomer = req.currentCustomer;
    var currentBasket = BasketMgr.getCurrentBasket();

    var form = server.forms.getForm('shipping');

    // verify shipping form data
    var shippingFormErrors = COHelpers.validateShippingForm(form.shippingAddress);

    if (!(Object.keys(shippingFormErrors).length > 0)) {
        viewData.giftTo = form.shippingAddress.giftTo.value || null;
        viewData.giftFrom = form.shippingAddress.giftFrom.value || null;
        viewData.email = form.shippingAddress.addressFields.email.value || null;

        res.setViewData(viewData);

        this.on('route:BeforeComplete', function (beforeCompleteReq, beforeCompleteRes) {
            var usingMultiShipping = beforeCompleteReq.session.privacyCache.get('usingMultiShipping');
            var currentLocale = Locale.getLocale(beforeCompleteReq.locale.id);

            var basketModel = new OrderModel(
                currentBasket,
                { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
            );

            var shipping = customShippingHelpers.getShippingModels(currentBasket, currentCustomer, 'basket');
            basketModel.shipping = shipping;

            beforeCompleteRes.json({
                customer: new AccountModel(beforeCompleteReq.currentCustomer),
                order: basketModel,
                form: server.forms.getForm('shipping')
            });
        });
    }

    next();
});

/**
 * @extends CheckoutServices-PlaceOrder
 *
 * Prepends the base functionality of the endpoint by:
 *  - Adds JRE attributes to the line items & shipments of the order.
 *  - Performs an address fraud check for baskets w/ trial-pack promotions
 */
server.prepend('PlaceOrder', function (req, res, next) { // eslint-disable-line consistent-return
    var log = Logger.getLogger('addressFraudCheck', 'addressFraudCheck');
    var CustomOrderHelpers = require(
        '*/cartridge/scripts/checkout/customOrderHelpers');
    var sessionFlash = require('*/cartridge/scripts/util/sessionFlash');
    var basket = BasketMgr.getCurrentBasket();
    var hasOneTimePromo = CustomOrderHelpers.checkForFraudCheckProduct();
    var hasFraudAddress = false;

    // If there is a One-Time-Use promotion in the basket, and the address has
    // already been used, then redirect to the cart, and add session flag for
    // a fraud address.
    if (hasOneTimePromo) {
        if (!empty(basket) &&
            !basket.allLineItems.empty &&
            !basket.shipments.empty
        ) {
            var shipments = basket.shipments.toArray();

            shipments.forEach(function (shipment) {
                if (!empty(shipment.shippingAddress) &&
                    !empty(shipment.productLineItems)
                ) {
                    var fraudCheckResult = CustomOrderHelpers
                        .checkFraudListForAddress(shipment.shippingAddress);

                    if (fraudCheckResult.match) {
                        hasFraudAddress = true;
                    }
                }
            });

            if (hasFraudAddress) {
                // If the address has already been used for a one-time-use
                // promotion, then redirect back to the cart and show an
                // error.
                session.custom.hasAddressFraud = true;

                // set this flag to have the promotional pricing removed
                // when the cart calculated
                session.custom.removeSnackPackPromotionalPricing = true;

                sessionFlash.addFlashMessage('cartAlerts', [{
                    message: Resource.msg('address.notallowed', 'checkout', null),
                    error: true
                }]);

                res.json({
                    error: true,
                    cartError: true,
                    redirectUrl: URLUtils.url('Cart-Show').toString(),
                    errorMessage: Resource.msg('address.notallowed', 'checkout', null)
                });
            }
        }
    } else {
        session.custom.hasAddressFraud = false;
    }

    var infoMsg = 'Address Fraud Check Results:\n' +
        'One time use promotion found: {0}\n' +
        'Address found in fraud list: {1}';

    log.info(infoMsg, hasOneTimePromo, hasFraudAddress);

    return next();
});

/**
 * @extends CheckoutServices-PlaceOrder
 *
 * Appends the base functionality of the endpoint by:
 *  - If a an order is fialed due to a payment issue, and the payment instrument
 *      was saved to their Wallet then remove it.
 */
server.append('PlaceOrder', function (req, res, next) {
    this.on('route:BeforeComplete', function (bcReq, bcRes) {
        var Transaction = require('dw/system/Transaction');
        var log = Logger.getLogger('paymentOperator', 'paymentOperator');
        var logPrefix = 'CheckoutServices.js in app_kind_snacks - ' +
            'CheckoutServices-PlaceOrder - route:BeforeComplete:\n\t';
        var viewData = bcRes.getViewData();
        var orderModel = viewData.order;
        var orderNo = !empty(orderModel) && orderModel.orderNumber ? orderModel.orderNumber : '';
        var isError = !empty(viewData.error) ? viewData.error : true;

        // If the order placement ended in an error condition, look for UUID that is stored in the
        // session for a new payment instrument required from a subscription product.
        if (isError) {
            var piUUID = bcReq.session.privacyCache.get('PaymentOperatorRemoveMePIUUID');
            var currentCustomer = session.customer;

            // Check the customer's wallet for a matching payment instrument UUID.
            if (currentCustomer.authenticated) {
                var wallet = currentCustomer.profile.wallet;
                var walletPIs = wallet.paymentInstruments;
                if (!empty(walletPIs) && !empty(piUUID)) {
                    walletPIs.toArray().forEach(function (paymentInstrument) {
                        if (paymentInstrument.UUID === piUUID) {
                            // If the matching payment instrument is found, remove it from the
                            // wallet.
                            Transaction.wrap(function () {
                                wallet.removePaymentInstrument(paymentInstrument);
                            });

                            // Log the removed CustomerPaymentInstrument
                            var logMsg = logPrefix + 'Removed payment instrument from wallet:\n\t';
                            logMsg += 'uuid: {0}\n\tcustomer number: {1}\n\torder id: {2}';
                            log.info(logMsg, piUUID, currentCustomer.profile.customerNo, orderNo);
                        }
                    });
                }
            }
        }

        // Reset the session variable.
        bcReq.session.privacyCache.set('PaymentOperatorRemoveMePIUUID', null);
    });

    return next();
});

/**
 * Send along email to SubmitPayment, which should have already been set on
 * SubmitShipping
 */
server.prepend('SubmitPayment', function (req, res, next) {
    this.on('route:BeforeComplete', function (beforeCompleteReq, beforeCompleteRes) {
        var currentBasket = BasketMgr.getCurrentBasket();
        var viewData = beforeCompleteRes.getViewData();

        if (!viewData.storedPaymentUUID) {
            viewData.email = { value: currentBasket.getCustomerEmail() || null };
        }

        beforeCompleteRes.setViewData(viewData);
        var reportingLog = Logger.getLogger('reportingEvent', 'reportingEvent');
        var reportingURL = URLUtils.https('ReportingEvent-Start',
            'ID', 'Checkout',
            'BasketID', currentBasket.UUID,
            'Step', '4',
            'Name', 'CheckoutReview'
        );
        var httpClient = new HTTPClient();
        httpClient.open('GET', reportingURL.toString());
        httpClient.setTimeout(3000);
        httpClient.send();
        if (httpClient.statusCode !== 200) {
            var infoMsg = 'Checkout Review Reporting event failed:\n' +
                'BasketID: {0}\n' +
                'Address: {1}\n' +
                'Text: {2}';
            reportingLog.warn(infoMsg, currentBasket.UUID, reportingURL.toString(), httpClient.text);
        }
    });

    return next();
});

server.prepend('SubmitPayment', function (req, res, next) {
    if (!req.currentCustomer.raw.authenticated) {
        next();
        return;
    }
    var paymentForm = server.forms.getForm('billing');
    var payOnAccount = paymentForm.paymentMethod.htmlValue.equals('PAYONACCOUNT');
    if (payOnAccount) {
        var creditApproved = req.currentCustomer.profile.creditApproved;
        var currentBasket = BasketMgr.getCurrentBasket();
        if (creditApproved) {
            var creditLimit = req.currentCustomer.profile.creditLimit;
            var totalGrossPrice = currentBasket.totalGrossPrice.value;
            if (totalGrossPrice > creditLimit) {
                res.json({
                    form: paymentForm,
                    fieldErrors: [],
                    serverErrors: 'Credit limit exceeded',
                    error: true
                });
                return;
            }
        }
        var viewData = {};
        // verify billing form data
        var billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);

        if (Object.keys(billingFormErrors).length) {
            // respond with form data and errors
            res.json({
                form: paymentForm,
                fieldErrors: [billingFormErrors],
                serverErrors: [],
                error: true
            });
        } else {
            viewData.paymentMethod = {
                value: paymentForm.paymentMethod.value,
                htmlName: paymentForm.paymentMethod.value
            };

            viewData.paymentInformation = {
                customer: {
                    value: paymentForm.creditCardFields.cardType.value,
                    htmlName: paymentForm.creditCardFields.cardType.htmlName
                }
            };

            res.setViewData(viewData);
            this.on('route:BeforeComplete', function (bcReq, bcRes) { // eslint-disable-line no-shadow
                var PaymentMgr = require('dw/order/PaymentMgr');
                var Transaction = require('dw/system/Transaction');
                var AccountModel = require('*/cartridge/models/account');
                var OrderModel = require('*/cartridge/models/order');
                var Locale = require('dw/util/Locale');
                var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
                var billingData = bcRes.getViewData();
                var Money = require('dw/value/Money');

                if (!currentBasket) {
                    delete billingData.paymentInformation;

                    bcRes.json({
                        error: true,
                        cartError: true,
                        fieldErrors: [],
                        serverErrors: [],
                        redirectUrl: URLUtils.url('Cart-Show').toString()
                    });
                    return;
                }
                var billingForm = server.forms.getForm('billing');
                var paymentMethodID = billingData.paymentMethod.value;

                Transaction.wrap(function () {
                    currentBasket.removeAllPaymentInstruments();
                    basketCalculationHelpers.calculateTotals(currentBasket);
                    // eslint-disable-next-line block-scoped-var
                    // eslint-disable-next-line no-shadow
                    var totalGrossPrice = currentBasket.getAdjustedMerchandizeTotalPrice().getValue();
                    var amount = new Money(totalGrossPrice, session.currency.currencyCode);
                    var opi = currentBasket.createPaymentInstrument(paymentForm.paymentMethod.value, amount);
                    var paymentTransaction = opi.getPaymentTransaction();
                    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentForm.paymentMethod.value).getPaymentProcessor();
                    paymentTransaction.setPaymentProcessor(paymentProcessor);
                });

                // if there is no selected payment option and balance is greater than zero
                // eslint-disable-next-line block-scoped-var
                if (!paymentMethodID && totalGrossPrice > 0) {
                    var noPaymentMethod = {};

                    noPaymentMethod[billingData.paymentMethod.htmlName] =
                        Resource.msg('error.no.selected.payment.method', 'creditCard', null);

                    delete billingData.paymentInformation;

                    bcRes.json({
                        form: billingForm,
                        fieldErrors: [noPaymentMethod],
                        serverErrors: 'no selected payment option and balance is greater than zero',
                        error: true
                    });
                    return;
                }

                // Re-calculate the payments.
                var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
                    currentBasket
                );

                if (calculatedPaymentTransaction.error) {
                    bcRes.json({
                        form: paymentForm,
                        fieldErrors: [],
                        serverErrors: 'Calculated Transaction error on pay on account',
                        error: true
                    });
                    return;
                }

                var usingMultiShipping = bcReq.session.privacyCache.get('usingMultiShipping');
                if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
                    bcReq.session.privacyCache.set('usingMultiShipping', false);
                    usingMultiShipping = false;
                }

                var currentLocale = Locale.getLocale(bcReq.locale.id);

                var basketModel = new OrderModel(
                    currentBasket,
                    { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
                );

                var accountModel = new AccountModel(bcReq.currentCustomer);
                var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
                    bcReq,
                    accountModel
                );

                delete billingData.paymentInformation;

                bcRes.json({
                    renderedPaymentInstruments: renderedStoredPaymentInstrument,
                    customer: accountModel,
                    order: basketModel,
                    form: billingForm,
                    error: false
                });
            });
        }
        next();
    } else {
        next();
    }
});


module.exports = server.exports();
