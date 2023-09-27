'use strict';

var base = require('base/checkout/billing');
var paymentOperator = require('./paymentoperator');
var addressHelpers = require('./address');
var cleave = require('../components/cleave');
/**
 * Updates the payment information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 */
function updatePaymentInformation(order) {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0
    ) {
        var paymentMethodData = order.billing.payment.selectedPaymentInstruments[0];
        if (paymentMethodData.paymentMethod === 'CREDIT_CARD'
            || /^PAYMENTOPERATOR_CREDIT_DIRECT/.test(paymentMethodData.paymentMethod)
        ) {
            htmlToAppend += '<span>' + order.resources.cardType + ' '
                + paymentMethodData.type
                + '</span><div>'
                + paymentMethodData.maskedCreditCardNumber
                + '</div><div><span>'
                + order.resources.cardEnding + ' '
                + paymentMethodData.expirationMonth
                + '/' + paymentMethodData.expirationYear
                + '</span></div>';
        } else if (/^PAYMENTOPERATOR_/.test(paymentMethodData.paymentMethod)) {
            // fallback for all methods without specific payment information
            htmlToAppend += '<div class="paymentoperator-selected-payment">'
                + paymentMethodData.paymentMethod
                + '</div>';
        } else {
            var paymentMethod = paymentMethodData.paymentMethod;
            if (paymentMethodData.paymentMethod === 'PAYONACCOUNT') {
                paymentMethod = 'Pay On Account';
            }
            htmlToAppend += '<div class="selected-payment">'
                + paymentMethod
                + '</div>';
        }
    }

    $paymentSummary.empty().append(htmlToAppend);
}
/**
 * updates the billing address form values within payment forms
 * @param {Object} order - the order model
 */
function updateBillingAddressFormValues(order) {
    var billing = order.billing;
    if (!billing.billingAddress || !billing.billingAddress.address) return;

    var form = $('form[name=dwfrm_billing]');
    if (!form) return;

    $('input[name$=_firstName]', form).val(billing.billingAddress.address.firstName);
    $('input[name$=_lastName]', form).val(billing.billingAddress.address.lastName);
    $('input[name$=_address1]', form).val(billing.billingAddress.address.address1);
    $('input[name$=_houseNumber]', form).val(billing.billingAddress.address.houseNumber);
    $('input[name$=_address2]', form).val(billing.billingAddress.address.address2);
    $('input[name$=_city]', form).val(billing.billingAddress.address.city);
    $('input[name$=_postalCode]', form).val(billing.billingAddress.address.postalCode);
    $('select[name$=_stateCode],input[name$=_stateCode]', form)
        .val(billing.billingAddress.address.stateCode);
    $('select[name$=_country]', form).val(billing.billingAddress.address.countryCode.value);
    $('input[name$=_phone]', form).val(billing.billingAddress.address.phone);
    $('input[name$=_email]', form).val(order.orderEmail);

    if (billing.payment && billing.payment.selectedPaymentInstruments
        && billing.payment.selectedPaymentInstruments.length > 0
    ) {
        var instrument = billing.payment.selectedPaymentInstruments[0];
        $('select[name$=expirationMonth]', form).val(instrument.expirationMonth);
        $('select[name$=expirationYear]', form).val(instrument.expirationYear);

        // Force security code and card number clear
        $('input[name$=securityCode]', form).val('');
        $('input[name$=cardNumber]').data('cleave').setRawValue('');
    }
}

/**
 * clears the billing address form values
 */
function clearBillingAddressFormValues() {
    updateBillingAddressFormValues({
        billing: {
            billingAddress: {
                address: {
                    countryCode: {}
                }
            }
        }
    });
}
/**
 * Updates the billing information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 * @param {Object} customer - customer model to use as basis of new truth
 * @param {Object} [options] - options
 */
function updateBillingInformation(order, customer) {
    base.methods.updateBillingAddressSelector(order, customer);

    // update billing address form
    updateBillingAddressFormValues(order);

    // update billing address summary
    addressHelpers.methods.populateAddressSummary('.billing .address-summary',
        order.billing.billingAddress.address);

    // update billing parts of order summary
    $('.order-summary-email').text(order.orderEmail);

    if (order.billing.billingAddress.address) {
        $('.order-summary-phone').text(order.billing.billingAddress.address.phone);
    }
}

var billing = Object.assign({}, base);

billing.methods.updatePaymentInformation = updatePaymentInformation;
billing.methods.updateBillingAddressFormValues = updateBillingAddressFormValues;
billing.methods.clearBillingAddressFormValues = clearBillingAddressFormValues;
billing.methods.updateBillingInformation = updateBillingInformation;

billing.paymentTabs = function () {
    $('.payment-options .nav-item').on('click', function (e) {
        e.preventDefault();
        var methodID = $(this).data('method-id');
        var idLower = methodID.toLowerCase();

        $('.payment-information').data('payment-method-id', methodID);
        // dotsource custom: update selected payment method in billing form
        $('input[name$=paymentMethod]').val(methodID);
        // hide other payment methods form
        $('.js-credit-card-selection-new').find('.tab-pane').removeClass('active');
        var paymentOptionTab = $('[id=' + idLower + '-content');
        if (paymentOptionTab.length) {
            paymentOptionTab.addClass('active');
            if (['PAYMENTOPERATOR_PAYMORROW_INVOICE', 'PAYMENTOPERATOR_PAYMORROW_SDD'].indexOf(methodID) > -1) {
                paymentOperator.paymorrowInit();
            }
        }
    });
};

billing.handleCreditCardNumber = function () {
    if ($('.cardNumber').length && $('#cardType').length) {
        cleave.handleCreditCardNumber('.cardNumber', '#cardType');
    }

    if ($('.creditDirectCardNumber').length && $('#creditDirectCardType').length) {
        cleave.handleCreditCardNumber('.creditDirectCardNumber', '#creditDirectCardType');
    }
};

billing.selectCreditCardForPaymentOperatorCreditCard = function () {
    $(document).on('click', '.paymentoperator-creditcard', function (e) {
        e.preventDefault();
        var self = $(this);
        var container = self.parents('.stored-payments');
        $('.paymentoperator-creditcard', container).removeClass('selected-payment')
            .removeClass('c-checkout-billing__saved-payment-instrument--selected');
        self.addClass('selected-payment')
            .addClass('c-checkout-billing__saved-payment-instrument--selected');
        $('input[name$=paymentoperatorcreditcard_creditcarduuid]').val(self.data('uuid'));
        // default logic: show input form for cvv
        $('.paymentoperator-creditcard .card-image').removeClass('checkout-hidden');
        $('.paymentoperator-creditcard .security-code-input').addClass('checkout-hidden');
        self.find('.card-image').addClass('checkout-hidden');
        self.find('.security-code-input').removeClass('checkout-hidden');
    });
};

billing.selectSavedPaymentInstrument = function () {
    $(document).on('click', '.saved-payment-instrument', function (e) {
        e.preventDefault();
        if (!$(this).hasClass('c-checkout-billing__saved-payment-instrument--selected')) {
            $('.saved-payment-security-code').val('');
            $('.saved-payment-instrument').removeClass('selected-payment');
            $(this).addClass('selected-payment');
            $('.saved-payment-instrument .card-image').removeClass('checkout-hidden');
            $('.saved-payment-instrument .security-code-input').addClass('checkout-hidden');
            $('.saved-payment-instrument.selected-payment' +
                ' .card-image').addClass('checkout-hidden');
            $('.saved-payment-instrument.selected-payment ' +
                '.security-code-input').removeClass('checkout-hidden');

            $('.saved-payment-instrument').removeClass('c-checkout-billing__saved-payment-instrument--selected');
            $(this).addClass('c-checkout-billing__saved-payment-instrument--selected');
        }
    });
};

billing.clearBillingForm = function () {
    $('body').on('checkout:clearBillingForm', function () {
        clearBillingAddressFormValues();
    });
};

module.exports = billing;
