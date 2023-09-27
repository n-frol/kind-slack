/* global request
'use strict';

/**
 * PayPalPPHelper.js
 *
 * A helper module for creating and managing customized CustomerPaymentInstrument
 * instances in order to store PayPal billing agreements to a customer's wallet.
 * @module PayPalPPHelper
 */

// SFCC API imports
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');

// Module level declarations
var log = Logger.getLogger('paymentOperator', 'paymentOperator');

/**
 * Checks the current order for subscription product line items. If there
 * are any subscription line items then the user must agree to the PayPal
 * billing agreement before they can be charged for multiple transactions
 * without logging into PP for each one.
 *
 * @param {dw.order.Order} order - The order that is currently being authorized.
 * @returns {boolean} - True if there are products that are subscription
 *      based in the customer's basket; otherwise false.
 */
function checkForSubscription(order) {
    var cookies = request.getHttpCookies();
    var cookieString = '';

    if (empty(cookies)) {
        return false;
    }

    var i = 0;

    try {
        while (i < cookies.getCookieCount()) {
            var cookie = cookies[i];
            var cookieName = cookie.getName();
            if (cookieName === 'og_cart_autoship') {
                cookieString = decodeURIComponent(cookie.getValue());
                break;
            }
            i++;
        }

        if (!empty(order) && !empty(cookieString)) {
            var cookieData = JSON.parse(cookieString);
            var pliCollection = order.getProductLineItems();

            if (cookieData && cookieData.length && !pliCollection.empty) {
                var pidArray = pliCollection.toArray().map(function (pli) {
                    return pli.productID;
                });

                var isSub = false;
                cookieData.forEach(function (cookieProduct) {
                    if ('id' in cookieProduct &&
                        pidArray.indexOf(String(cookieProduct.id)) > -1
                    ) {
                        isSub = true;
                    }
                });

                return isSub;
            }
        } else {
            return false;
        }
    } catch (e) {
        log.error(e);
        return false;
    }
}

/**
 * Creates a new customer payment instrument that holds the information for the
 * PayPal billing agreement that the user has agreed to.
 *
 * @param {dw.util.HashMap} responseMap - The decrypted response from calling
 *      the Computop service.
 * @param {dw.order.Order} order - The demandware order object
 * @memberof PayPalHelpers
 */
function createPayPalCustomerPI(responseMap, order) {
    try {
        var agreementId = responseMap.get('billingagreementid');
        var ppPi = null;
        var profile = session.customer && session.customerAuthenticated &&
            !empty(session.customer.profile) ? session.customer.profile : null;

        if (!empty(profile) && !empty(agreementId)) {
            var wallet = profile.wallet;
            var walletPIs = wallet.getPaymentInstruments();

            Transaction.wrap(function () {
                // Remove preferred flag from all other payment instruments.
                if (!empty(walletPIs)) {
                    walletPIs.toArray().forEach(function (wpi) {
                        wpi.custom.preferred = false;
                    });
                }

                ppPi = wallet.createPaymentInstrument('PayPal');
                ppPi.setCreditCardHolder(profile.firstName + ' ' + profile.lastName);
                ppPi.custom.paymentOperatorPPBillingAgreementId = agreementId;
                ppPi.setCreditCardType('PayPal');
                ppPi.setCreditCardNumber(agreementId);

                // Set PI's phone field.  Use billing address if set
                var phone = '';
                if (!empty(order)) {
                    var billingAddress = order.getBillingAddress();

                    if (!empty(billingAddress) && !empty(billingAddress.phone)) {
                        phone = billingAddress.phone;
                    }
                }
                if (empty(phone) && !empty(profile.addressBook) && !empty(profile.addressBook.preferredAddress) && !empty(profile.addressBook.preferredAddress.phone)) {
                    phone = profile.addressBook.preferredAddress.phone;
                }

                ppPi.custom.phone = phone;

                // Set as the default payment instrument so that it can be
                // reused by the OrderGroove cartridge.
                ppPi.custom.preferred = true;
                customer.profile.custom.defaultPaymentInstrument = ppPi.UUID;
            });
        }
    } catch (e) {
        var eString = '';
        Object.keys(e).forEach(function(eKey) {
            eString += '\n' + eKey + ': ' + e[eKey];
        });
        log.error('ERROR in PayPalHelpers at createPayPalCustomerPI: {0}',
        eString);
    }
}

/**
 * Checks if the current customer has a stored payment instrument with the
 * billing agreement ID custom attribute (paymentOperatorPPBillingAgreementId)
 * set.
 *
 * @returns {string} - Returns the existing billing agreement ID if a PayPal
 *      payment instrument is stored in the user's wallet, or an empty string
 *      if not.
 * @memberof PayPalHelpers
 */
function getPayPalCustomerPI() {
    var result = '';
    var profile = session.customer && session.customerAuthenticated &&
        !empty(session.customer.profile) ? session.customer.profile : null;

    try {
        if (!empty(profile)) {
            var piArray = !empty(profile.wallet) &&
                !profile.wallet.paymentInstruments.empty ?
                profile.wallet.getPaymentInstruments().toArray() : [];

            if (piArray.length) {
                piArray.forEach(function (pi) {
                    var type = pi.getCreditCardType();

                    // Custom PayPal payment instruments are stored as credit card
                    // payment instruments with the type set as PayPal and the
                    // billing agreement stored in the CC number field.
                    if (!empty(type) && type === 'PayPal' &&
                        !empty(pi.custom.paymentOperatorPPBillingAgreementId)
                    ) {
                        result = new String(pi.custom
                            .paymentOperatorPPBillingAgreementId);
                    }
                });
            }
        }
    } catch (e) {
        var errMsg = 'ERROR in PayPalHelpers.js at getPayPalCustomerPI()';
        log.error(errMsg, e);
    }

    return result;
}

/**
 * Sets an address as the billing & shipping addresses for the order. This is
 * used when processing a payment using an existing billing agreement from the
 * PayPal Express call, since there is no address provided by the customer at
 * the time of placing the order.
 *
 * @param {dw.customer.CustomerAddress} address - The customer address to use as
 *      the shipping and billing address for processing of the order.
 * @returns {boolean} - Returns true for success & false for error conditions.
 * @memberof PayPalHelpers
 */
function setOrderAddresses(address) {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    var defaultShipment = !empty(basket) ? basket.getDefaultShipment() : null;
    var billingAddress = basket.billingAddress;
    var shippingAddress = !empty(defaultShipment) ?
        defaultShipment.shippingAddress : null;
    var success = false;

    try {
        if (!empty(basket) && !empty(defaultShipment)) {
            // Transactional Changes
            var success = Transaction.wrap(function() {
                // If no billing address, create one.
                if (empty(billingAddress)) {
                    billingAddress = basket.createBillingAddress();
                }

                // If no default shipment shipping address, create one.
                if (empty(shippingAddress)) {
                    shippingAddress = defaultShipment.createShippingAddress();
                }

                // Set billing address fields.
                billingAddress.setAddress1(address.address1);
                billingAddress.setFirstName(address.firstName);
                billingAddress.setLastName(address.lastName);
                billingAddress.setCity(address.city);
                billingAddress.setStateCode(address.stateCode);
                billingAddress.setPostalCode(address.postalCode);
                billingAddress.setCountryCode(address.countryCode);

                // Set shipping address fields
                shippingAddress.setAddress1(address.address1);
                shippingAddress.setFirstName(address.firstName);
                shippingAddress.setLastName(address.lastName);
                shippingAddress.setCity(address.city);
                shippingAddress.setStateCode(address.stateCode);
                shippingAddress.setPostalCode(address.postalCode);
                shippingAddress.setCountryCode(address.countryCode);

                // Check for optional address fields.
                if (!empty(address.address2)) {
                    billingAddress.setAddress2(address.address2);
                    shippingAddress.setAddress2(address.address2);
                }

                if (!empty(address.phone)) {
                    billingAddress.setPhone(address.phone);
                    shippingAddress.setPhone(address.phone);
                }

                // Set email for basket
                basket.setCustomerEmail(customer.profile.getEmail());

                return true;
            });
        } else {
            throw 'Invalid basket found at: PayPalHelpers.setOrderAddress()';
        }
    } catch (e) {
        var errMsg = 'ERROR in PayPalHelpers.js at setOrderAddresses().';
        Object.keys(e).forEach(function (key) {
            errMsg += '\n' + key + ': ' + e[key];
        });
        log.error(errMsg);
        success = false;
    }

    return success;
}

/**
 * Handle the computop service call to authorize the PayPal transaction for
 * PayPal reference transactions.
 *
 * @param {dw.order.Basket} basket - The current basket.
 */
function handleExpressReferenceTransaction(basket) {
    var HookMgr = require('dw/system/HookMgr');
    var OrderMgr = require('dw/order/OrderMgr');
    var logPrefix = 'ERROR in PayPalHelpers.js at handleExpressReferenceTransaction():\n\t';

    try {
        // Create the payment instrument.
        var paymentInstrument = basket.createPaymentInstrument(
            PAYPAL_PAYMENT_METHOD, basket.totalGrossPrice);

        // Create the order.
        order = OrderMgr.createOrder(basket, orderNo);

        var authorizationResult = new Object();

        // Call the computop service to process the auth.
        if(HookMgr.hasHook('app.payment.processor.paymentoperator_paymentgate')) {
            authorizationResult = HookMgr.callHook('app.payment.processor.paymentoperator_paymentgate',
                'Authorize',
                order.getOrderNo(),
                paymentInstrument,
                paymentInstrument.getPaymentTransaction().getPaymentProcessor()
            );
        } else {
            authorizationResult = HookMgr.callHook('app.payment.processor.default', 'Authorize', {
                Order: order,
                OrderNo: order.getOrderNo(),
                PaymentInstrument: paymentInstrument
            });
        }
        if(authorizationResult.not_supported || authorizationResult.error) {
            OrderMgr.failOrder(order);
            log.warn(logPrefix + 'Failing Order: {0} due to Authorization Error.', order.orderNo);
            ISML.renderTemplate('ErrorXML', {
                ErrorCode: '140',
                ErrorMsg: 'Authorization error.'
            });
            return;
        }
        else if(authorizationResult.declined) {
            OrderMgr.failOrder(order);
            log.warn(logPrefix + 'Failing Order: {0} due to Authorization Declined.', order.orderNo);

            ISML.renderTemplate('ErrorXML', {
                ErrorCode: '140',
                ErrorMsg: 'Authorization declined.'
            });
            return;
        }

    } catch (e) {
        // Log The full error object.
        var errMsg = logPrefix + 'There was an error processing the reference transaction:';
        Object.keys(e).forEach(function (key) {
            errMsg += '\n\t' + key + ': ' + e[key];
        });
        log.error(errMsg);

        // Set the paymentoperator error in the session variable.
        req.session.privacyCache.set('paymentOperatorError',
            Resource.msg('paypalexpress.error',
                'paymentoperator', null));
        res.redirect(URLUtils.https('Cart-Show'));
        return next();
    }
}

/**
 * Gets the value of the language parameter to append to the PayPal redirect
 * URLs to set the language when redirecting.
 *
 * @returns {string} - The value to use for the language parameter computed from
 *      the request locale.
 */
function getPayPalLanguageParam() {
    /**
     * Supported locales can be found in the Computop PayPal Integration Guide:
     *  - https://www.computop.com/fileadmin/user_upload/Downloads_Content/english/Handbuch/Manual_Computop_Paygate_PayPal_EN.pdf#page=16
     *
     * The Computop API default value is 'DE' so we need to send this parameter.
     */
    var COMPUTOP_PAYPAL_LOCALES = ['AU', 'DE', 'FR', 'IT', 'GB', 'ES', 'US'];
    var KIND_PREFERED_LOCALE = 'US';

    var locale = request.locale;
    var result = KIND_PREFERED_LOCALE;

    if (!empty(locale) && locale.length >= 2) {
        var localeString = locale.substring(locale.length - 2);

        if (COMPUTOP_PAYPAL_LOCALES.indexOf(localeString)) {
            result = localeString;
        }
    }

    return result;
}

module.exports = {
    createPayPalCustomerPI: createPayPalCustomerPI,
    checkForSubscription: checkForSubscription,
    handleExpressReferenceTransaction: handleExpressReferenceTransaction,
    getPayPalCustomerPI: getPayPalCustomerPI,
    getPayPalLanguageParam: getPayPalLanguageParam,
    setOrderAddresses: setOrderAddresses
};
