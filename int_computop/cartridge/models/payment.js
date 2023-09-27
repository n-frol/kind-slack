'use strict';

var Money = require('dw/value/Money');
var collections = require('*/cartridge/scripts/util/collections');

var base = module.superModule;

/**
 * Creates an array of objects containing selected payment information
 * @param {dw.util.ArrayList<dw.order.PaymentInstrument>} selectedPaymentInstruments - ArrayList
 *      of payment instruments that the user is using to pay for the current basket
 * @returns {Array} Array of objects that contain information about the selected payment instruments
 */
function getSelectedPaymentInstruments(selectedPaymentInstruments) {
    return collections.map(selectedPaymentInstruments, function (paymentInstrument) {
        var results = {
            paymentMethod: paymentInstrument.paymentMethod,
            amount: paymentInstrument.paymentTransaction.amount.value
        };
        if (paymentInstrument.paymentMethod === 'CREDIT_CARD'
            || paymentInstrument.paymentMethod === 'PAYMENTOPERATOR_CREDIT_DIRECT'
        ) {
            results.lastFour = paymentInstrument.creditCardNumberLastDigits;
            results.owner = paymentInstrument.creditCardHolder;
            results.expirationYear = paymentInstrument.creditCardExpirationYear;
            results.type = paymentInstrument.creditCardType;
            results.maskedCreditCardNumber = paymentInstrument.maskedCreditCardNumber;
            results.expirationMonth = paymentInstrument.creditCardExpirationMonth;

            // Assign Custom Attribute Values.
            results.paymentOperatorCCNr = paymentInstrument.custom.paymentOperatorCCNr
                ? paymentInstrument.custom.paymentOperatorCCNr
                : null;
            results.paymentOperatorCCBrand = paymentInstrument.custom.paymentOperatorCCBrand
                ? paymentInstrument.custom.paymentOperatorCCBrand
                : null;
        } else if (paymentInstrument.paymentMethod === 'DW_APPLE_PAY') {
            results.lastFour = paymentInstrument.creditCardNumberLastDigits;
            results.owner = paymentInstrument.creditCardHolder;
            results.type = paymentInstrument.creditCardType;
            results.maskedCreditCardNumber = '***********'+ paymentInstrument.maskedCreditCardNumber;
            // Assign Custom Attribute Values.
            results.paymentOperatorCCNr = paymentInstrument.custom.paymentOperatorCCNr
                ? paymentInstrument.custom.paymentOperatorCCNr
                : null;
            results.paymentOperatorCCBrand = paymentInstrument.custom.paymentOperatorCCBrand
                ? paymentInstrument.custom.paymentOperatorCCBrand
                : null;
        } else if (paymentInstrument.paymentMethod === 'GIFT_CERTIFICATE') {
            results.giftCertificateCode = paymentInstrument.giftCertificateCode;
            results.maskedGiftCertificateCode = paymentInstrument.maskedGiftCertificateCode;
        } else if (paymentInstrument.paymentMethod === 'PAYMENTOPERATOR_EASYCREDIT') {
            if (Object.prototype.hasOwnProperty.call(paymentInstrument.custom, 'paymentOperatorECInterestAmount')) {
                results.easycreditInterestAmount = new Money(
                    paymentInstrument.custom.paymentOperatorECInterestAmount,
                    paymentInstrument.paymentTransaction.amount.currencyCode
                );
            } else {
                results.easycreditInterestAmount = new Money(
                    0,
                    paymentInstrument.paymentTransaction.amount.currencyCode
                );
            }
            if (Object.prototype.hasOwnProperty.call(paymentInstrument.custom, 'paymentOperatorECTechnicalTransactionID')) {
                results.easyCreditTransactionID = paymentInstrument.custom.paymentOperatorECTechnicalTransactionID;
            }
        }

        return results;
    });
}

/**
 * Payment class that represents payment information for the current basket
 * @param {dw.order.Basket} currentBasket - the target Basket object
 * @param {dw.customer.Customer} currentCustomer - the associated Customer object
 * @param {string} countryCode - the associated Site countryCode
 * @constructor
 */
function Payment(currentBasket, currentCustomer, countryCode) {
    base.call(this, currentBasket, currentCustomer, countryCode);

    var paymentInstruments = currentBasket.paymentInstruments;
    this.selectedPaymentInstruments = paymentInstruments ?
        getSelectedPaymentInstruments(paymentInstruments) : null;
}

Payment.prototype = Object.create(base.prototype);

module.exports = Payment;
