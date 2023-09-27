/* global session, empty */

'use strict';

// SFCC API imports
var Logger = require('dw/system/Logger');

// Import SFRA Modules
var server = require('server');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

/* Replace SubmitPayment-Route */
var CheckoutServices = module.superModule;

server.extend(CheckoutServices);

server.replace(
    'SubmitPayment',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        // SFCC API imports
        var BasketMgr = require('dw/order/BasketMgr');
        var PaymentInstrument = require('dw/order/PaymentInstrument');

        var log = Logger.getLogger('paymentOperator', 'paymentOperator');
        var logPrefix = 'PAYMENTOPERATOR_PAYMENTGATE - CheckoutServices.js at' +
            ' SumbitPayment:\n';
        var paymentForm = server.forms.getForm('billing');
        var billingFormErrors = {};
        var creditCardErrors = {};
        if (!res.viewData) {
            var viewData = {};
        }
        else {
            var viewData = res.viewData;
        }

        var respJson = {};
        var logMsg = '';

        // verify billing form data
        billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);

        // dotsource custom, was:
        // if (!req.form.storedPaymentUUID) {
        if (!req.form.storedPaymentUUID && PaymentInstrument.METHOD_CREDIT_CARD === paymentForm.paymentMethod.value) {
            // verify credit card form data
            // dotsource custom, was
            // creditCardErrors = COHelpers.validateCreditCard(paymentForm);
            creditCardErrors = COHelpers.validateCreditCard(paymentForm.creditCardFields);
        }

        // validate payment operator payment forms
        var paymentOperatorErrors = {};
        if (req.form.storedPaymentUUID && paymentForm.paymentMethod.value.equals('PAYMENTOPERATOR_CREDIT_DIRECT')) {
            // credit direct does not require form check when using customer payment instrument
        } else {
            paymentOperatorErrors = require('*/cartridge/scripts/computop/helpers/formHelpers').validatePaymentForms(paymentForm);
        }

        Object.keys(paymentOperatorErrors).forEach(function (key) {
            billingFormErrors[key] = paymentOperatorErrors[key];
        });

        // remove payment operator payment methods
        var popStatus = require('*/cartridge/scripts/computop/util/Checkout').removePaymentOperatorInstrumentsFromBasket();

        // FIXME display error message occuring from popStatus
        if (Object.keys(creditCardErrors).length || Object.keys(billingFormErrors).length || !popStatus) {
            respJson = {
                gtmPaymentMethod: paymentForm.paymentMethod.htmlValue,
                form: paymentForm,
                fieldErrors: [billingFormErrors, creditCardErrors],
                serverErrors: [],
                error: true
            };

            // Log the error response.
            logMsg = logPrefix + '\tValidation Error submitting payment: {0}'
            log.info(logMsg, JSON.stringify(respJson.fieldErrors));
            res.json(respJson);
            return next();
        } else {
            viewData.address = {
                firstName: { value: paymentForm.addressFields.firstName.value },
                lastName: { value: paymentForm.addressFields.lastName.value },
                address1: { value: paymentForm.addressFields.address1.value },
                address2: { value: paymentForm.addressFields.address2.value },
                city: { value: paymentForm.addressFields.city.value },
                postalCode: { value: paymentForm.addressFields.postalCode.value },
                countryCode: { value: paymentForm.addressFields.country.value }
            };

            // dotsource custom: set housenumber
            if (Object.prototype.hasOwnProperty.call(paymentForm.addressFields, 'houseNumber')) {
                viewData.address.houseNumber = {
                    value: paymentForm.addressFields.houseNumber.value
                };
            }

            if (Object.prototype.hasOwnProperty.call(paymentForm.addressFields, 'states')) {
                viewData.address.stateCode =
                    { value: paymentForm.addressFields.states.stateCode.value };
            }

            viewData.paymentMethod = {
                value: paymentForm.paymentMethod.value,
                htmlName: paymentForm.paymentMethod.value
            };

            // values from default credit card form
            viewData.paymentInformation = {
                cardType: {
                    value: paymentForm.creditCardFields.cardType.value,
                    htmlName: paymentForm.creditCardFields.cardType.htmlName
                },
                cardNumber: {
                    value: paymentForm.creditCardFields.cardNumber.value,
                    htmlName: paymentForm.creditCardFields.cardNumber.htmlName
                },
                securityCode: {
                    value: paymentForm.creditCardFields.securityCode.value,
                    htmlName: paymentForm.creditCardFields.securityCode.htmlName
                },
                expirationMonth: {
                    value: parseInt(
                        paymentForm.creditCardFields.expirationMonth.selectedOption,
                        10
                    ),
                    htmlName: paymentForm.creditCardFields.expirationMonth.htmlName
                },
                expirationYear: {
                    value: parseInt(paymentForm.creditCardFields.expirationYear.value, 10),
                    htmlName: paymentForm.creditCardFields.expirationYear.htmlName
                }
            };

            // values from credit direct
            if (paymentForm.paymentMethod.value.equals('PAYMENTOPERATOR_CREDIT_DIRECT')) {
                var creditDirectData = {};
                var creditDirectFields = ['cardType', 'cardNumber', 'securityCode', 'expirationMonth', 'expirationYear'];
                creditDirectFields.forEach(function (field) {
                    var creditDirectField = paymentForm.creditdirect[field];
                    creditDirectData[field] = {
                        value: creditDirectField.value,
                        htmlName: creditDirectField.htmlName
                    };
                });

                if (!paymentForm.shippingAddressUseAsBillingAddress.value) {
                    session.privacy.PaymentOperatorCCSecurityCode = paymentForm.creditdirect['securityCode'].value;
                }

                viewData.paymentInformation = creditDirectData;
            }

            if (req.form.storedPaymentUUID) {
                viewData.storedPaymentUUID = req.form.storedPaymentUUID;
            }

            var currentBasket = BasketMgr.getCurrentBasket();
            var customerEmail = currentBasket.customerEmail;
            // if basket holds an email address that is different to that from customer's profile
            if (req.currentCustomer.profile) {
                customerEmail = req.currentCustomer.profile.email;
            }
            if (!customerEmail) {
                // fallback to srfa default - email address comes with credit card form
                customerEmail = paymentForm.creditCardFields.email.value;
            }
            viewData.email = {
                value: customerEmail
            };

            viewData.phone = { value: paymentForm.addressFields.phone.value };

            viewData.saveCard = paymentForm.creditCardFields.saveCard.checked;
            viewData.creditDirectSave = !empty(paymentForm.creditdirect) ?
                paymentForm.creditdirect.saveCard.checked : false;
            viewData.creditDirectMakeDefault = !empty(paymentForm.creditdirect) ?
                paymentForm.creditdirect.makeDefault.checked : false;

            res.setViewData(viewData);
        }

        /**
         * @extends CheckoutServices-SubmitPayment
         * @listens 'route:BeforeComplete
         */
        this.on('route:BeforeComplete', function (bcReq, bcRes) { // eslint-disable-line no-shadow
            var CustomerMgr = require('dw/customer/CustomerMgr');
            var HookMgr = require('dw/system/HookMgr');
            var Resource = require('dw/web/Resource');
            var PaymentMgr = require('dw/order/PaymentMgr');
            var Transaction = require('dw/system/Transaction');
            var AccountModel = require('*/cartridge/models/account');
            var OrderModel = require('*/cartridge/models/order');
            var URLUtils = require('dw/web/URLUtils');
            var array = require('*/cartridge/scripts/util/array');
            var Locale = require('dw/util/Locale');
            var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
            var customCheckoutHelpers = require('*/cartridge/scripts/checkout/customCheckoutHelpers');
            var billingData = bcRes.getViewData();
            var accountModel = new AccountModel(bcReq.currentCustomer);
            var usingMultiShipping = bcReq.session.privacyCache.get('usingMultiShipping');
            var currentLocale = Locale.getLocale(bcReq.locale.id);
            var basketModel;

            if (!currentBasket) {
                delete billingData.paymentInformation;

                bcRes.json({
                    error: true,
                    cartError: true,
                    fieldErrors: [],
                    serverErrors: [],
                    redirectUrl: URLUtils.url('Cart-Show').toString()
                });

                log.warn(logPrefix + '\tWARNING - Empty Basket');
                return;
            }

            var basketHasSubscription = customCheckoutHelpers.checkBasketForSubscription();
            var billingAddress = currentBasket.billingAddress;
            var billingForm = server.forms.getForm('billing');
            var paymentMethodID = billingData.paymentMethod.value;
            var result;

            billingForm.creditCardFields.cardNumber.htmlValue = '';
            billingForm.creditCardFields.securityCode.htmlValue = '';
            // reset creditdirect
            billingForm.creditdirect.cardNumber.htmlValue = '';
            billingForm.creditdirect.securityCode.htmlValue = '';

            Transaction.wrap(function () {
                if (!billingAddress) {
                    billingAddress = currentBasket.createBillingAddress();
                }

                billingAddress.setFirstName(billingData.address.firstName.value);
                billingAddress.setLastName(billingData.address.lastName.value);
                billingAddress.setAddress1(billingData.address.address1.value);
                billingAddress.setAddress2(billingData.address.address2.value);
                // dotsource custom: set housenumber
                if (Object.prototype.hasOwnProperty.call(billingData.address, 'houseNumber')) {
                    billingAddress.custom.houseNumber = billingData.address.houseNumber.value;
                }

                billingAddress.setCity(billingData.address.city.value);
                billingAddress.setPostalCode(billingData.address.postalCode.value);
                if (Object.prototype.hasOwnProperty.call(billingData.address, 'stateCode')) {
                    billingAddress.setStateCode(billingData.address.stateCode.value);
                }
                billingAddress.setCountryCode(billingData.address.countryCode.value);

                // dotsource: storedPaymentUUID comes only for registered customers using the default credit card payment method
                if (billingData.storedPaymentUUID) {
                    billingAddress.setPhone(bcReq.currentCustomer.profile.phone || billingData.phone.value);
                    currentBasket.setCustomerEmail(bcReq.currentCustomer.profile.email);
                } else if (bcReq.currentCustomer.profile && bcReq.currentCustomer.profile.email) {
                    // dotsource: make checkout process available at least to registered customers
                    billingAddress.setPhone(billingData.phone.value);
                    currentBasket.setCustomerEmail(bcReq.currentCustomer.profile.email);
                } else {
                    billingAddress.setPhone(billingData.phone.value);
                    currentBasket.setCustomerEmail(billingData.email.value);
                }
            });

            // if there is no selected payment option and balance is greater than zero
            if (!paymentMethodID && currentBasket.totalGrossPrice.value > 0) {
                var noPaymentMethod = {};

                noPaymentMethod[billingData.paymentMethod.htmlName] =
                    Resource.msg('error.no.selected.payment.method', 'creditCard', null);

                delete billingData.paymentInformation;

                respJson = {
                    form: billingForm,
                    fieldErrors: [noPaymentMethod],
                    serverErrors: [],
                    error: true
                };

                log.info(logPrefix + '\tNo selected payment option & balance > 0\n\t' +
                    JSON.stringify(respJson.fieldErrors)
                );

                resp.json(respJson);
                return;
            }

            // Get the payment method.
            var payMethod = PaymentMgr.getPaymentMethod(paymentMethodID);
            var payProcessor = payMethod.getPaymentProcessor();

            // check to make sure there is a payment processor
            if (empty(payProcessor)) {
                var resourceMsg = Resource.msg(
                    'error.payment.processor.missing',
                    'checkout',
                    null
                );

                log.error(logPrefix + '\t' + resourceMsg);
                throw new Error(resourceMsg);
            }

            var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();

            if (billingData.storedPaymentUUID
                && bcReq.currentCustomer.raw.authenticated
                && bcReq.currentCustomer.raw.registered
            ) {
                var paymentInstruments = bcReq.currentCustomer.wallet.paymentInstruments;
                var paymentInstrument = array.find(paymentInstruments, function (item) {
                    return billingData.storedPaymentUUID === item.UUID;
                });

                billingData.paymentInformation.cardNumber.value = paymentInstrument
                    .creditCardNumber;
                billingData.paymentInformation.cardType.value = paymentInstrument
                    .creditCardType;
                billingData.paymentInformation.securityCode.value = bcReq.form.securityCode;
                billingData.paymentInformation.expirationMonth.value = paymentInstrument
                    .creditCardExpirationMonth;
                billingData.paymentInformation.expirationYear.value = paymentInstrument
                    .creditCardExpirationYear;
                billingData.paymentInformation.creditCardToken = paymentInstrument
                    .raw.creditCardToken;

                // as security code is required later for credit direct authorization
                bcReq.session.privacyCache.set('PaymentOperatorCCSecurityCode', bcReq.form.securityCode);
                bcReq.session.privacyCache.set('PaymentOperatorCCUUID', paymentInstrument.UUID);
            }

            var hookName = 'app.payment.processor.' + processor.ID.toLowerCase();
            if (payMethod.ID === 'PAYONACCOUNT') {
                result = {
                    error: false
                }

            } else if (HookMgr.hasHook(hookName)) {
                // Log Payment Hook Call
                log.info(logPrefix +
                    'Calling payment Handle() method for payment hook: {0}',
                    hookName
                );

                result = HookMgr.callHook(hookName,
                    'Handle',
                    currentBasket,
                    billingData.paymentInformation
                );
            } else {
                // Log Payment Hook Call
                log.info(logPrefix +
                    'Calling payment Handle() method for payment hook: {0}',
                    'app.payment.processor.default'
                );

                result = HookMgr.callHook('app.payment.processor.default', 'Handle');
            }

            // need to invalidate credit card fields
            if (result.error) {
                logMsg = logPrefix +
                    '\tUnable to validate billing information is valid: ';
                delete billingData.paymentInformation;

                if (!empty(result.fieldErrors)) {
                    logMsg += '\n\t' + JSON.stringify(result.fieldErrors);
                }

                if (!empty(result.serverErrors)) {
                    logMsg += '\n\t' + JSON.stringify(result.serverErrors);
                }

                logMsg += '\tUnable to process payment handle hook';

                log.info(logMsg)

                bcRes.json({
                    form: billingForm,
                    fieldErrors: result.fieldErrors,
                    serverErrors: result.serverErrors,
                    error: true
                });
                return;
            }

            var saveCCMethod = billingData.saveCard &&
                paymentMethodID.equals('CREDIT_CARD');
            var saveCDMethod = billingData.creditDirectSave &&
                paymentMethodID.equals('PAYMENTOPERATOR_CREDIT_DIRECT');

            // Check if the card needs to be saved to the user's Wallet.
            if (payMethod.ID !== 'PAYONACCOUNT'
                && !billingData.storedPaymentUUID
                && bcReq.currentCustomer.raw.authenticated
                && bcReq.currentCustomer.raw.registered
            ) {
                var duplicatePI = false;
                var walletHasDefault = false;
                var customer = CustomerMgr.getCustomerByCustomerNumber(
                    bcReq.currentCustomer.profile.customerNo);
                var wallet = customer.getProfile().getWallet();
                var walletPIs = wallet.paymentInstruments.empty ?
                    [] : wallet.paymentInstruments.toArray();
                var pInfo = billingData.paymentInformation;

                // Check if the customer has a defualt PI saved && check if the payment data
                // matches an already saved card.
                if (walletPIs.length) {
                    walletPIs.forEach(function (wpi) {
                        if (!empty(wpi.creditCardNumber) &&
                            !empty(wpi.creditCardExpirationMonth) &&
                            !empty(wpi.creditCardExpirationYear) &&
                            //wpi.creditCardNumber === pInfo.cardNumber.value &&
                            wpi.creditCardExpirationMonth === pInfo.expirationMonth.value &&
                            wpi.creditCardExpirationYear === pInfo.expirationYear.value
                        ) {
                            duplicatePI = true;
                        }

                        // Set as the default payment method.
                        if ('preferred' in wpi.custom && wpi.custom.preferred) {
                            walletHasDefault = true;
                        }
                    });
                }

                // If there are subscription purchases in the cart which will require future
                // payments, and the customer doesn't have a default payment method in their
                // wallet, then force the save of the PI to the customer's Wallet, and set as
                // default automatically.
                var forceSave = basketHasSubscription &&
                    !walletHasDefault &&
                    !paymentMethodID.equals('PAYMENTOPERATOR_PAYPAL') &&
                    !paymentMethodID.equals('PAYMENTOPERATOR_PAYPALEXPRESS');

                // If the user selected to save the payment instrument, or there is a
                // subscription product in the cart, then save the Payment Instrument.
                if (forceSave || saveCCMethod || saveCDMethod) {
                    if (!duplicatePI) {
                        /* ================================================================== *
                         * Save Card To Wallet
                         * ================================================================== */
                        var saveCardResult = COHelpers.customSavePaymentInstrumentToWallet(
                            billingData,
                            currentBasket,
                            customer
                        );

                        bcReq.currentCustomer.wallet.paymentInstruments.push({
                            creditCardHolder: saveCardResult.creditCardHolder,
                            maskedCreditCardNumber: saveCardResult.maskedCreditCardNumber,
                            creditCardType: saveCardResult.creditCardType,
                            creditCardExpirationMonth: saveCardResult.creditCardExpirationMonth,
                            creditCardExpirationYear: saveCardResult.creditCardExpirationYear,
                            UUID: saveCardResult.UUID,
                            creditCardNumber: Object.hasOwnProperty.call(saveCardResult,
                                'creditCardNumber') ? saveCardResult.creditCardNumber : null,
                            raw: saveCardResult
                        });
                        bcReq.session.privacyCache.set('PaymentOperatorCCUUID', saveCardResult.UUID);

                        // Update the custom fields for the new CustomerPaymentInstrument, and set
                        // the default payment method if the checkbox is checked, or this is a
                        // subscription product without a default payment method set.
                        Transaction.wrap(function () {
                            // set address fields
                            saveCardResult.custom.address1 = billingData.address.address1.value;
                            saveCardResult.custom.address2 = billingData.address.address2.value;
                            saveCardResult.custom.city = billingData.address.city.value;
                            saveCardResult.custom.stateCode = billingData.address.stateCode.value;
                            saveCardResult.custom.postalCode = billingData.address.postalCode.value;

                            // If default flag is set, save.
                            if (paymentForm.creditdirect.makeDefault.checked || !walletHasDefault) {
                                // loop through and set the preferred flag
                                var paymentInstruments = wallet.getPaymentInstruments('CREDIT_CARD');
                                var ppPaymentInstruments = wallet.getPaymentInstruments('PayPal');

                                if (!ppPaymentInstruments.empty) {
                                    paymentInstruments.addAll(ppPaymentInstruments);
                                }

                                var paymentInstrumentIterator = paymentInstruments.iterator();

                                // loop through payment methods and set the preferred flag
                                while (paymentInstrumentIterator.hasNext()) {
                                    var currentPaymentInstrument = paymentInstrumentIterator.next();

                                    if (currentPaymentInstrument.UUID === saveCardResult.UUID) {
                                        currentPaymentInstrument.custom.preferred = true;
                                    } else {
                                        currentPaymentInstrument.custom.preferred = false;
                                    }
                                }

                                customer.profile.custom.defaultPaymentInstrument = saveCardResult.UUID;
                            }
                        });

                        // Log the successful payment instrument save.
                        logMsg = '\tNew payment instrument saved to customer wallet.';
                        logMsg += '\n\tCustomer ID: ' + customer.ID;
                        logMsg += '\n\tCustomer Login: ' + customer.profile.email;
                        logMsg += '\n\tPayment Instrument UUID: ' + saveCardResult.UUID;
                        logMsg += '\n\tPayment Instrument Payment Method: ' + saveCardResult.paymentMethod;
                        logMsg += '\n\tPayment Instrument Card No.: ' + saveCardResult.maskedCreditCardNumber;
                        logMsg += '\n\tSet as Default: ' + saveCardResult.custom.preferred;
                        log.info(logPrefix + logMsg);

                        // Add a session variable to note that the payment was just saved. If
                        // the order placement fails, the payment method will get removed.
                        req.session.privacyCache.set('PaymentOperatorRemoveMePIUUID',
                            saveCardResult.UUID);
                    } else {
                        /* ================================================================== *
                         * Handle Duplicate Saved Payment Card
                         * ================================================================== */
                        // Log the failure
                        log.info(logPrefix + '\tUnable to save payment instrument to wallet: ' +
                            'A CustomerPaymentInstrument with the same card number and expiration ' +
                            'already exists in the customer Wallet');

                        // Get basket model for view data.
                        basketModel = new OrderModel(
                            currentBasket,
                            { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
                        );

                        // Get PIs for view data.
                        var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
                            bcReq,
                            accountModel,
                            basketModel
                        );

                        // Return an error.
                        bcRes.json({
                            error: true,
                            form: billingForm,
                            customer: accountModel,
                            order: basketModel,
                            fieldErrors: [],
                            serverErrors: [Resource.msg('error.payment.add.duplicate', 'checkout', null)]
                        });
                        return;
                    }
                }
            }

            // Calculate the basket
            Transaction.wrap(function () {
                basketCalculationHelpers.calculateTotals(currentBasket);
            });

            // Re-calculate the payments.
            var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
                currentBasket
            );

            if (calculatedPaymentTransaction.error) {
                bcRes.json({
                    form: paymentForm,
                    fieldErrors: [],
                    serverErrors: [Resource.msg('error.technical', 'checkout', null)],
                    error: true
                });
                return;
            }

            if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
                bcReq.session.privacyCache.set('usingMultiShipping', false);
                usingMultiShipping = false;
            }

            basketModel = new OrderModel(
                currentBasket,
                { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
            );

            var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
                bcReq,
                accountModel,
                basketModel
            );

            delete billingData.paymentInformation;

            var viewDataJson = {
                renderedPaymentInstruments: renderedStoredPaymentInstrument,
                customer: accountModel,
                order: basketModel,
                form: billingForm,
                error: false
            };

            // set payment operator redirect url for easycredit
            if (paymentMethodID === 'PAYMENTOPERATOR_EASYCREDIT') {
                var OrderMgr = require('dw/order/OrderMgr');
                var PaymentOperatorRedirectHelper = require('*/cartridge/scripts/computop/util/RedirectPayment');
                var easycreditRedirectUrl = PaymentOperatorRedirectHelper.getEasyCreditRedirectUrl(
                    currentBasket,
                    OrderMgr.createOrderNo(),
                    bcReq.session
                );
                viewDataJson.easycreditRedirect = easycreditRedirectUrl.url;
            }

            bcRes.json(viewDataJson);
        });
        return next();
    }
);

/**
 * Place order action
 */
server.replace('PlaceOrder', server.middleware.https, function (req, res, next) {
    // SFCC API imports
    var BasketMgr = require('dw/order/BasketMgr');
    var HookMgr = require('dw/system/HookMgr');
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');

    // Helper module imports
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var CustomOrderHelpers = require('*/cartridge/scripts/checkout/customOrderHelpers');

    // Route level declarations.
    var log = Logger.getLogger('paymentOperator', 'paymentOperator');
    var logPrefix = 'PAYMENTOPERATOR_PAYMENTGATE - CheckoutServices.js at' +
        ' PlaceOrder:\n';
    var logMsg = '';
    var currentBasket = BasketMgr.getCurrentBasket();
    var hasOneTimePromo = CustomOrderHelpers.checkForFraudCheckProduct();

    if (!currentBasket || session.custom.hasAddressFraud) {
        logMsg = logPrefix + '\tOrder could not be placed:\n\t';

        if (session.custom.hasAddressFraud) {
            logMsg += 'Address FAILS fruad check for ont-time-use promos';
        }

        if (!currentBasket) {
            logMsg += 'No current basket found.';
        }

        // Log the failure.
        log.warn(logMsg);

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
        logMsg = logPrefix + '\tOrder could not be placed:\n\t'
        logMsg += 'Fraud issue detected with order.';

        // Log the failure.
        log.warn(logMsg);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationBasketStatus = HookMgr.callHook(
        'app.validate.basket',
        'validateBasket',
        currentBasket,
        false
    );

    if (validationBasketStatus.error) {
        logMsg = logPrefix + '\tOrder could not be placed:\n\t' +
            validationBasketStatus.message;

        // Log the failure.
        log.warn(logMsg);

        res.json({
            error: true,
            errorMessage: validationBasketStatus.message
        });
        return next();
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        var noShipMsg = Resource.msg('error.no.shipping.address',
            'checkout', null);

        // Log the failure.
        log.warn(logPrefix + '\tOrder could not be placed:\n\t' + noShipMsg);

        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: noShipMsg
        });
        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        var noBillMsg = Resource.msg('error.no.billing.address', 'checkout',
            null);

        // Log the failure.
        log.warn(logPrefix + '\tOrder could not be placed:\n\t' + noBillMsg);

        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: noBillMsg
        });
        return next();
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    //Bypass validation if pay on account
    if (!empty(currentBasket.paymentInstrument) && currentBasket.paymentInstrument.paymentMethod !== 'PAYONACCOUNT') {
        var validPayment = COHelpers.validatePayment(req, currentBasket);
        var paymentErrorMessage = Resource.msg('error.payment.not.valid', 'checkout', null);

        // check for easy credit specific error messages
        if (req.session.privacyCache.get('easycreditError')) {
            paymentErrorMessage = req.session.privacyCache.get('easycreditError');
            req.session.privacyCache.set('easycreditError', false);
        }

        if (validPayment.error) {
            logMsg = logPrefix + '\tOrder could not be placed:\n\t';
            logMsg += paymentErrorMessage;

            // Log the failure.
            log.warn(logMsg);

            res.json({
                error: true,
                errorStage: {
                    stage: 'payment',
                    step: 'paymentInstrument'
                },
                errorMessage: paymentErrorMessage
            });
            return next();
        }
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        var calPayTransMsg = Resource.msg('error.technical', 'checkout', null);
        logMsg = logPrefix + '\tOrder could not be placed:\n\t';
        logMsg += calPayTransMsg;

        // Log the failure.
        log.warn(logMsg);

        res.json({
            error: true,
            errorMessage: calPayTransMsg
        });
        return next();
    }

    // confirm paid on account credit limit is greater than order total before creating order
    var customer = req.currentCustomer.raw,
        profile = customer.profile,
        newLimit = null;
    if (!empty(currentBasket.paymentInstrument) && currentBasket.paymentInstrument.paymentMethod === 'PAYONACCOUNT' && !empty(profile) && profile.custom.creditApproved) {
        var creditLimit = profile.custom.creditLimit;
        var totalGrossPrice = currentBasket.totalGrossPrice.value;
        if (totalGrossPrice < creditLimit) {
            //handle pay on account transaction and update of customer.profile.custom.creditLimit
            var newLimit = new Number(creditLimit - totalGrossPrice);
            newLimit = parseInt(newLimit);
        }
        else {
            var log = Logger.getLogger('paymentOperator', 'paymentOperator');
            var logPrefix = 'Paid on Account Credit limit failure - CheckoutServices.js at PlaceOrder:\n';
            logMsg = logPrefix + '\tOrder could not be placed:\n\t' +
                validationBasketStatus.message;
            log.warn(logMsg);
            res.json({
                error: true,
                errorMessage: logMsg
            });
            return next();
        }
    }
    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        var calPayTransMsg = Resource.msg('error.technical', 'checkout', null);
        logMsg = logPrefix + '\tOrder could not be created:\n\t';
        logMsg += calPayTransMsg;

        // Log the failure.
        log.warn(logMsg);

        res.json({
            error: true,
            errorMessage: calPayTransMsg
        });
        return next();
    }

    var Site = require('dw/system/Site');
    var esku = Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs");
    var foundexclusive = false;
    if (esku !== null) {
        var ArrayList = require('dw/util/ArrayList');
        var lineitems = order.allProductLineItems;
        var exclusiveskus: ArrayList = new ArrayList(Site.getCurrent().getCustomPreferenceValue("exclusiveSKUs"));
        var exclusivenames = new ArrayList();
        var foundexclusivee = false;
        var foundnonexclusive = false;

        for (var item in lineitems) {
            var sku = lineitems[item].productID;
            if (exclusiveskus.contains(sku)) {
                exclusivenames.add(lineitems[item].lineItemText);
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
    }

    //Bypass auth if pay on account
    if (!empty(currentBasket.paymentInstrument) && currentBasket.paymentInstrument.paymentMethod === 'PAYONACCOUNT' && !empty(newLimit)) {
        // Grab credit limit, update profile and order attribute
        Transaction.wrap(function () {
            profile.custom.creditLimit = newLimit;
            order.custom.creditLimit = newLimit;
        });
    } else {
        var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);
        if (handlePaymentResult.error) {
            logMsg = logPrefix + '\tOrder could not be placed:\n\t';
            logMsg += 'ERROR authorizing payment.';

            // Log the failure.
            log.warn(logMsg);

            res.json({
                error: true,
                errorStage: {
                    stage: 'payment',
                    step: 'paymentInstrument'
                },
                errorMessage: Resource.msg('error.payment.not.authorized', 'checkout', null)
            });
            return next();
        } else if (Object.prototype.hasOwnProperty.call(handlePaymentResult, 'acs_redirect')) {
            // Check if a 3d-secure ccard was used.
            res.render('checkout/paymentoperator_directcredit_3d_redirect',
                {
                    PaymentOperatorUrl: handlePaymentResult.acs_redirect.get('ACSURL'),
                    PaymentRequest: handlePaymentResult.acs_redirect.get('PaReq'),
                    TermUrl: handlePaymentResult.acs_redirect.get('TermUrl')
                }
            );
            return next();
        }
    }

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

    // Places the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        logMsg = logPrefix + '\tUnable to place order!';

        // Log the failure.
        log.error(logMsg);

        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    if (foundexclusive) {
        Transaction.wrap(function () {
            order.exportStatus = order.EXPORT_STATUS_NOTEXPORTED;
        });
    }

    // if it's a one-time promo, add address to fraud check
    if (hasOneTimePromo) {
        if (!empty(currentBasket) &&
            !currentBasket.allLineItems.empty &&
            !currentBasket.shipments.empty
        ) {
            var shipments = currentBasket.shipments.toArray();

            shipments.forEach(function (shipment) {
                if (!empty(shipment.shippingAddress) &&
                    !empty(shipment.productLineItems)
                ) {
                    var fraudCheckResult = CustomOrderHelpers
                        .checkFraudListForAddress(shipment.shippingAddress);

                    if (!fraudCheckResult.match) {
                        // If the address is not in the custom object, then allow it,
                        // and add it to the custom object.
                        CustomOrderHelpers.addAddressToFraudList(
                            shipment.shippingAddress);
                    }
                }
            });
        }
    }

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    // Remove paypalexpress & masterpass quickcheckout session data
    req.session.privacyCache.set('PaypalExpressData', false);
    req.session.privacyCache.set('MasterPassQuickCheckoutData', false);

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
