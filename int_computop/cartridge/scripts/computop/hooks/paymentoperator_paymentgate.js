/* eslint-disable no-multi-spaces */
/* globals session */

'use strict';

/* API Includes */
var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site').getCurrent();
var Transaction = require('dw/system/Transaction');

/* Script includes */
var server = require('server');
var PaymentOperatorCheckout = require(
    '~/cartridge/scripts/computop/util/Checkout');
var redirectPayment = require(
    '~/cartridge/scripts/computop/util/RedirectPayment');
var socketPayment = require('~/cartridge/scripts/computop/util/SocketPayment');
var masterpassTransactionPayment = require(
    '~/cartridge/scripts/computop/util/MasterPassTransactionPayment');
var sessionDataConversion = require(
    '~/cartridge/scripts/computop/util/SessionDataConversion');
var PayPalHelpers = require(
    '*/cartridge/scripts/computop/helpers/PayPalHelpers');

// Module level declarations.
var log = Logger.getLogger('paymentOperator', 'paymentOperator');
var logPrefix = 'PAYMENTOPERATOR_PAYMENTGATE - paymetnoperator_paygate.js\n';

/**
 * Handle method for creating the payment instrument of a PaymentOperator
 * payment method.
 *
 * @param {dw.order.Basket} basket - current basket
 * @param {Object} paymentInformation - billing form data
 * @returns {Object} - result
 */
function Handle(basket, paymentInformation) {
    var billingForm = server.forms.getForm('billing');
    // selected payment method
    var paymentMethod = billingForm.paymentMethod.value;

    // Log the attempt.
    log.info(logPrefix + '\tBeginning Handle method for: {0}', paymentMethod);

    if (paymentMethod === 'PAYMENTOPERATOR_CREDIT_DIRECT') {
        var creditDirectErrors = PaymentOperatorCheckout.isValidCreditDirect(paymentInformation);
        if (!creditDirectErrors.error) {
            Transaction.wrap(function () {
                // remove credit_direct payment instruments from basket
                removePaymentInstruments(basket, paymentMethod); // eslint-disable-line no-use-before-define

                var paymentInstrument = basket.createPaymentInstrument(paymentMethod, basket.totalGrossPrice);
                // FIXME is this correct - as the credit card owner can be another person as the customer
                paymentInstrument.setCreditCardHolder(basket.billingAddress.fullName);
                paymentInstrument.setCreditCardNumber(paymentInformation.cardNumber.value);
                paymentInstrument.setCreditCardType(paymentInformation.cardType.value);
                paymentInstrument.setCreditCardExpirationMonth(paymentInformation.expirationMonth.value);
                paymentInstrument.setCreditCardExpirationYear(paymentInformation.expirationYear.value);
                paymentInstrument.setCreditCardToken(
                    paymentInformation.creditCardToken
                    ? paymentInformation.creditCardToken
                    : createMockToken() // eslint-disable-line no-use-before-define
                );
            });

            return { success: true };
        }
        return creditDirectErrors;
    } else if (paymentMethod === 'PAYMENTOPERATOR_PAYMORROW_SDD' || paymentMethod === 'PAYMENTOPERATOR_PAYMORROW_INVOICE') {
        var paymentInstrument;

        if (Site.getCustomPreferenceValue('paymentOperatorPaymorrowBillingSameAsShipping')) {
            var shippingAddress = basket.getDefaultShipment().getShippingAddress();

            if (!shippingAddress.isEquivalentAddress(basket.getBillingAddress())) {
                return {
                    error: true,
                    fieldErrors: [],
                    serverErrors: [Resource.msg('paymorrow.init.error.identicaladdress', 'paymentoperator', null)]
                };
            }
        }

        Transaction.wrap(function () {
            removePaymentInstruments(basket, paymentMethod); // eslint-disable-line no-use-before-define
            paymentInstrument = basket.createPaymentInstrument(paymentMethod, basket.totalGrossPrice);
            basket.custom.paymentOperatorRefNr = require('dw/util/UUIDUtils').createUUID(); // eslint-disable-line no-param-reassign
        });

        // save cart hash for later comparison in session
        session.privacy.carthash = PaymentOperatorCheckout.createContainerHash(basket);

        if (require('~/cartridge/scripts/computop/util/PaymorrowPayment')
            .callService(basket, paymentInstrument, 'INIT')
        ) {
            return { success: true };
        }
        return {
            error: true,
            fieldErrors: [],
            serverErrors: [Resource.msg('paymorrow.initialization.failed', 'paymentoperator', null)]
        };
    }
    Transaction.wrap(function () {
        removePaymentInstruments(basket, paymentMethod); // eslint-disable-line no-use-before-define
        var opi = basket.createPaymentInstrument(paymentMethod, basket.totalGrossPrice);

            // If the customer is paying with PayPal and has an existing billing
            // agreement saved, then set the card type as PayPal.
        var ppPi = PayPalHelpers.getPayPalCustomerPI();
        if (ppPi) {
            opi.setCreditCardType('PayPal');
        }
    });

    return { success: true };
}

/**
 * Authorizes a payment using a Computop payment method.

 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var methodName = paymentInstrument.paymentMethod;
    var result;
    var success;

    // Log the attempt.
    log.info(logPrefix + '\tBeginning Authorize for: {0}', methodName);

    try {
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNumber);

        if (methodName === 'PAYMENTOPERATOR_PAYMORROW_SDD' || methodName === 'PAYMENTOPERATOR_PAYMORROW_INVOICE') {
            var oldhash = session.privacy.carthash;
            var currenthash = PaymentOperatorCheckout.createContainerHash(order);

            // re-init if hash has changed
            if (oldhash !== currenthash) {
                var paymorrow = require('~/cartridge/scripts/computop/util/PaymorrowPayment');
                if (!paymorrow.callService(order, paymentInstrument, 'REINIT')) {
                    return { error: true };
                }
            }

            // now socket payment call
            success = socketPayment.callService(methodName, order, paymentInstrument);
        } else {
            // try socket payment call first
            result = socketPayment.callService(methodName, order, paymentInstrument);
            if (result) {
                // distinguish between standard workflow and purchase with 3d-secure-enrolled ccard
                success = result !== true ? 'ACS_REDIRECT' : true;
            }
            // MasterPassQuickCheckout socket call
            var mpqcoData = sessionDataConversion.getMasterPassQuickCheckoutDataFromSession();
            if (mpqcoData && paymentInstrument.paymentMethod === 'PAYMENTOPERATOR_MASTERPASS_QUICKCHECKOUT') {
                success = masterpassTransactionPayment.callService(mpqcoData, order, paymentInstrument);
            }

            if (redirectPayment.savePaymentDetails(orderNumber, paymentInstrument, paymentProcessor)) {
                success = true;
            }
        }
    } catch (e) {
        var eString = logPrefix + '\tERROR in payment authorization process:';
        eString += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();
        log.error(eString);
    }

    if (success === true) {
        log.info(logPrefix + 'Payment Auth Success.');
        return { authorized: true };
    } else if (success === 'ACS_REDIRECT') {
        return { acs_redirect: result };
    }
    log.info(logPrefix + 'Payment Auth Failed.');
    return { error: true };
}

/**
 * Capture a payment using a Computop payment method.

 * @param {number} orderNumber - The current order's number
 * @param { dw.object.CustomObject } customObject - The custom object of the current capture job.
 * @return {Object} returns an error object
 */
function Capture(orderNumber, customObject) {
    // var methodName = paymentInstrument.paymentMethod;
    // Log the attempt.
    log.info(logPrefix + '\tBeginning Capture for: {0}', orderNumber);
    try {
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNumber);

        // create transfer object
        var CreditCaptureObject = require('~/cartridge/scripts/computop/transferobjects/PAYMENTOPERATOR_CREDIT_CAPTURE');
        CreditCaptureObject.setOrder(order);
        CreditCaptureObject.setCustomObject(customObject);

        // call service
        var CreditDirectService = require('~/cartridge/scripts/computop/svc/CreditDirectCaptureService');
        var call = CreditDirectService.call(CreditCaptureObject.getTransferObject());

        // If service call fails doesn't through error, fallowing code logs it.
        if (Object.prototype.hasOwnProperty.call(call, 'status')) {
            if (call.status === 'ERROR') {
                log.info(logPrefix + '\tService call error: {0}', call.errorMessage);
            }
        }
        var result = CreditDirectService.getResponse();
        return result;
    } catch (e) {
        var eString = logPrefix + '\tERROR in payment capture process:';
        eString += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();
        log.error(eString);
    }
}

/**
 * Refund a payment using a Computop payment method.

 * @param {number} orderNumber - The current order's number
 * @param { dw.object.CustomObject } customObject - The custom object of the current capture job.
 * @return {Object} returns an error object
 */
function Refund(orderNumber, customObject) {
    // var methodName = paymentInstrument.paymentMethod;
    // Log the attempt.
    log.info(logPrefix + '\tBeginning Refund for: {0}', orderNumber);
    try {
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNumber);

        // create transfer object
        var CreditRefundObject = require('~/cartridge/scripts/computop/transferobjects/PAYMENTOPERATOR_CREDIT_REFUND');
        CreditRefundObject.setOrder(order);
        CreditRefundObject.setCustomObject(customObject);

        // call service
        var CreditDirectService = require('~/cartridge/scripts/computop/svc/CreditDirectRefundService');
        var call = CreditDirectService.call(CreditRefundObject.getTransferObject());
        // If service call fails doesn't through error, fallowing code logs it.
        if (Object.prototype.hasOwnProperty.call(call, 'status')) {
            if (call.status === 'ERROR') {
                log.info(logPrefix + '\tService call error: {0}', call.errorMessage);
            }
        }
        var result = CreditDirectService.getResponse();
        return result;
    } catch (e) {
        var eString = logPrefix + '\tERROR in payment refund process:';
        eString += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();
        log.error(eString);
    }
}

/**
 * Helper function to remove existing payment instruments from cart
 *
 * @param {dw.order.Basket} basket - current basket
 * @param {string} paymentMethod - current paymentMethod
 */
function removePaymentInstruments(basket, paymentMethod) {
    var paymentInstrumentsIterator = basket.getPaymentInstruments(paymentMethod).iterator();
    while (paymentInstrumentsIterator.hasNext()) {
        var pi = paymentInstrumentsIterator.next();
        basket.removePaymentInstrument(pi);
    }
}

/**
 * Creates a token. This should be replaced by utilizing a tokenization provider
 * @returns {string} a token
 */
function createMockToken() {
    // see app_storefront_base/basic_credit.js
    return Math.random().toString(36).substr(2);
}

/*
 * Export handle / authorize
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
exports.Capture = Capture;
exports.Refund = Refund;
