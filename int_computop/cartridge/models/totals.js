/* eslint-disable max-len */
'use strict';

var Money = require('dw/value/Money');
var formatMoney = require('dw/util/StringUtils').formatMoney;

var base = module.superModule;

/**
 * Get interest rates for easycredit payment
 *
 * @param {dw.order.LineItemCtnr} lineItemContainer - current basket
 * @returns {Object} - interest rates value and formatted
 */
function getEasyCreditInterestRate(lineItemContainer) {
    var paymentInstruments = lineItemContainer.getPaymentInstruments('PAYMENTOPERATOR_EASYCREDIT');

    var interestAmount = new Money(0, lineItemContainer.getCurrencyCode());
    if (paymentInstruments.size() === 1) {
        var paymentInstrument = paymentInstruments.get(0);
        if (Object.prototype.hasOwnProperty.call(paymentInstrument.custom, 'paymentOperatorECInterestAmount')) {
            interestAmount = new Money(
                paymentInstrument.custom.paymentOperatorECInterestAmount,
                paymentInstrument.paymentTransaction.amount.currencyCode
            );
        }
    }

    return {
        value: interestAmount.value,
        formatted: formatMoney(interestAmount),
        amount: interestAmount
    };
}

/**
 * Accepts a total object and formats the value
 * @param {dw.value.Money} total - Total price of the cart
 * @returns {string} the formatted money value
 */
function getTotals(total) {
    return !total.available ? '-' : formatMoney(total);
}

/**
 * @constructor
 * @classdesc totals class that represents the order totals of the current line item container
 *
 * @param {dw.order.lineItemContainer} lineItemContainer - The current user's line item container
 */
function totals(lineItemContainer) {
    base.call(this, lineItemContainer);

    this.easyCreditInterestRate = null;
    if (lineItemContainer) {
        this.easyCreditInterestRate = getEasyCreditInterestRate(lineItemContainer);

        if (this.grandTotal !== '-') {
            var grandTotal = lineItemContainer.totalGrossPrice.add(this.easyCreditInterestRate.amount);
            this.grandTotal = getTotals(grandTotal);
        }
    }
}

module.exports = totals;
