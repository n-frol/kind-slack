'use strict';
var URLUtils = require('dw/web/URLUtils');
var base = module.superModule;

/**
 * Creates a plain object that contains payment instrument information
 * @param {Object} wallet - current customer's wallet
 * @returns {Object} object that contains info about the current customer's payment instrument
 */
function getPayment(wallet) {
    if (wallet) {
        var paymentInstruments = wallet.paymentInstruments;
        var paymentInstrument = paymentInstruments[0];

        if (paymentInstrument) {
            return {
                maskedCreditCardNumber: paymentInstrument.maskedCreditCardNumber,
                creditCardType: paymentInstrument.creditCardType,
                creditCardExpirationMonth: paymentInstrument.creditCardExpirationMonth,
                creditCardExpirationYear: paymentInstrument.creditCardExpirationYear,
                paymentMethod: paymentInstrument.raw.paymentMethod
            };
        }
    }
    return null;
}

/**
 * Creates a plain object that contains payment instrument information
 * @param {Object} userPaymentInstruments - current customer's paymentInstruments
 * @returns {Object} object that contains info about the current customer's payment instruments
 */
function getCustomerPaymentInstruments(userPaymentInstruments) {
    var paymentInstruments;

    paymentInstruments = userPaymentInstruments.map(function (paymentInstrument) {
        var result = {
            creditCardHolder: paymentInstrument.creditCardHolder,
            maskedCreditCardNumber: paymentInstrument.maskedCreditCardNumber,
            creditCardType: paymentInstrument.creditCardType,
            creditCardExpirationMonth: paymentInstrument.creditCardExpirationMonth,
            creditCardExpirationYear: paymentInstrument.creditCardExpirationYear,
            UUID: paymentInstrument.UUID,
            paymentMethod: paymentInstrument.raw.paymentMethod
        };

        result.cardTypeImage = {
            src: URLUtils.staticURL('/images/' +
                paymentInstrument.creditCardType.toLowerCase().replace(/\s/g, '') +
                '-dark.svg'),
            alt: paymentInstrument.creditCardType
        };

        return result;
    });

    return paymentInstruments;
}

/**
 * Account class that represents the current customer's profile dashboard
 * @param {dw.customer.Customer} currentCustomer - Current customer
 * @param {Object} addressModel - The current customer's preferred address
 * @param {Object} orderModel - The current customer's order history
 * @constructor
 */


/**
 * Creates a plain object that contains profile information
 * @param {Object} profile - current customer's profile
 * @returns {Object} an object that contains information about the current customer's profile,
 *                      along with any Pay On Account information
 */
function getProfile(profile) {
    var result;
    if (profile) {
        var creditApproved = profile.creditApproved || false;
        var creditLimit = profile.creditLimit || 0;
        result = {
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phone: profile.phone,
            creditApproved: creditApproved,
            creditLimit: creditLimit,
            password: '********'
        };
    } else {
        result = null;
    }
    return result;
}

function account(currentCustomer, addressModel, orderModel) {
    base.apply(this, [currentCustomer, addressModel, orderModel]);
    this.profile = getProfile(currentCustomer.profile);
    this.payment = getPayment(currentCustomer.wallet);
    this.customerPaymentInstruments = currentCustomer.wallet
        && currentCustomer.wallet.paymentInstruments
        ? getCustomerPaymentInstruments(currentCustomer.wallet.paymentInstruments)
        : null;
}

account.getCustomerPaymentInstruments = getCustomerPaymentInstruments;

module.exports = account;
