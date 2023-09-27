/* eslint-disable max-len */
'use strict';

var base = module.superModule;
var URLUtils = require('dw/web/URLUtils');

/**
 * Sorts the customers payment instruments so their default appears first
 * @param {Array} paymentInstruments - Array that contains info about the current customer's payment instruments
 * @param {string} defaultPaymentInstrument - The UUID of the customer's default payment instrument
 * @return {Array} - Array that contains info about the current customer's payment instruments sorted with the default payment first
 */
function sortCustomerPaymentInstruments(paymentInstruments, defaultPaymentInstrument) {
    var sortedPaymentInstruments = paymentInstruments;

	if (!empty(defaultPaymentInstrument)) {
		for (var i=0; i < paymentInstruments.length; i++) {
			if (sortedPaymentInstruments[i].UUID === defaultPaymentInstrument) {
				[sortedPaymentInstruments[0], sortedPaymentInstruments[i]] = [sortedPaymentInstruments[i], sortedPaymentInstruments[0]];
				break;
			}
        }
	}

    return sortedPaymentInstruments;
}

/**
 * Creates a plain object that contains payment instrument information
 * @param {Object[]} userPaymentInstruments - current customer's paymentInstruments
 * @param {string} defaultPaymentInstrument - The UUID of the user's default payment instrument
 * @returns {Object} object that contains info about the current customer's payment instruments
 */
function getCustomerPaymentInstruments(userPaymentInstruments, defaultPaymentInstrument) {
    var paymentInstruments;

    paymentInstruments = userPaymentInstruments.map(function (paymentInstrument) {
        var orgPaymentInstrument = paymentInstrument.raw;
        var isPayPal = orgPaymentInstrument.creditCardType === 'PayPal';
        var maskedNumber = paymentInstrument.maskedCreditCardNumber;

        if (isPayPal) {
            var maskedBillAgreement = new String(
                orgPaymentInstrument.custom.paymentOperatorPPBillingAgreementId
            ).trim();
            maskedNumber = maskedNumber.substring(0, 11);

            var cl = maskedBillAgreement.length;

            maskedNumber += maskedBillAgreement.substring(
                cl - 5,
                cl -1
            );
        }

        var result = {
            creditCardHolder: paymentInstrument.creditCardHolder,
            maskedCreditCardNumber: maskedNumber,
            creditCardType: paymentInstrument.creditCardType,
            creditCardExpirationMonth: paymentInstrument.creditCardExpirationMonth,
            creditCardExpirationYear: paymentInstrument.creditCardExpirationYear,
            UUID: paymentInstrument.UUID,
            // set paymentOperatorCCNr / paymentOperatorCCBrand to display card in customer account if ready for credit direct
            paymentOperatorCCNr: getCustomProperty(orgPaymentInstrument, 'paymentOperatorCCNr'), // eslint-disable-line no-use-before-define
            paymentOperatorCCBrand: getCustomProperty(orgPaymentInstrument, 'paymentOperatorCCBrand'), // eslint-disable-line no-use-before-define
            phone: (!empty(paymentInstrument.raw) && !empty(paymentInstrument.raw.custom)) ? paymentInstrument.raw.custom.phone : null
        };

        result.cardTypeImage = {
            src: URLUtils.staticURL('/images/' +
                paymentInstrument.creditCardType.toLowerCase().replace(/\s/g, '') +
                '-dark.svg'),
            alt: paymentInstrument.creditCardType
        };

        return result;
    });

    if (!empty(defaultPaymentInstrument)) {
        paymentInstruments = sortCustomerPaymentInstruments(paymentInstruments, defaultPaymentInstrument);
    }

    return paymentInstruments;
}

/**
 * Helper to retrieve custom property of provided payment instrument (object)
 *
 * @param {dw.customer.PaymentInstrument} pi - customer paymentinstrument
 * @param {string} prop - custom property name
 * @returns {string} - custom property value or null
 */
function getCustomProperty(pi, prop) {
    var result = null;
    if (Object.hasOwnProperty.call(pi, 'custom') && Object.hasOwnProperty.call(pi.custom, prop)) {
        result = pi.custom[prop];
    }
    return result;
}

/**
 * Account class that represents the current customer's profile dashboard
 * @param {dw.customer.Customer} currentCustomer - Current customer
 * @param {Object} addressModel - The current customer's preferred address
 * @param {Object} orderModel - The current customer's order history
 * @constructor
 */
function account(currentCustomer, addressModel, orderModel) {
    base.call(this, currentCustomer, addressModel, orderModel);

    var defaultPaymentInstrument;
    if (!empty(currentCustomer.raw) && !empty(currentCustomer.raw.profile) && !empty(currentCustomer.raw.profile.custom)) {
        defaultPaymentInstrument = currentCustomer.raw.profile.custom.defaultPaymentInstrument;
    }

    this.customerPaymentInstruments = currentCustomer.wallet
        && currentCustomer.wallet.paymentInstruments
        ? getCustomerPaymentInstruments(currentCustomer.wallet.paymentInstruments, defaultPaymentInstrument)
        : null;
}
account.getCustomerPaymentInstruments = getCustomerPaymentInstruments;

module.exports = account;
