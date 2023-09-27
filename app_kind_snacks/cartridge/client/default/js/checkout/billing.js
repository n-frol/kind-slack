'use strict';

/**
 * billing.js
 * @extends int_computop/cartridge/client/default/js/checkout/billing.js
 *
 * Extends the functionality of the billing plugin for the SFRA jQuery checkout.
 */

const base = require('int_computop/checkout/billing');
const billing = Object.assign({}, base);

function getCardType(number) {
    var ccNum = String(number);
    var visaRegEx = /^(?:4[0-9]{12}(?:[0-9]{3})?)$/;
    var mastercardRegEx = /^(?:5[1-5][0-9]{14})$/;
    var amexpRegEx = /^(?:3[47][0-9]{13})$/;

    if (visaRegEx.test(ccNum)) {
        jQuery(".cardtype").attr('src', jQuery("#visalogo").attr('src'));
        jQuery(".cardtype").show();
    } else if (mastercardRegEx.test(ccNum)) {
        jQuery(".cardtype").attr('src', jQuery("#mastercardlogo").attr('src'));
        jQuery(".cardtype").show();
    } else if (amexpRegEx.test(ccNum)) {
        jQuery(".cardtype").attr('src', jQuery("#amexlogo").attr('src'));
        jQuery(".cardtype").show();
    }
    jQuery(".cardtype").hide();
    return "";
}

jQuery("#creditDirectCardNumber").keyup(function () {
    var num = jQuery("#creditDirectCardNumber").val();
    getCardType(num);
});

/**
 * Updated to not clear email or phone
 * Called in such a way that this function can be overwritten in another module without needing to update the methods that call it.
 *
 * clears the credit card form
 */
function clearCreditCardForm() {
    $('input[name$="_cardNumber"]').data('cleave').setRawValue('');
    $('select[name$="_expirationMonth"]').val('');
    $('select[name$="_expirationYear"]').val('');
    $('input[name$="_securityCode"]').val('');
}

billing.methods.clearCreditCardForm = clearCreditCardForm;

billing.addNewPaymentInstrument = function () {
    const billingObj = this; // The billing object/module at the time the function is called

    $('.btn.add-payment').on('click', function (e) {
        e.preventDefault();
        $('.payment-information').data('is-new-payment', true);

        // Always try and use the latest version of the method in the module, before falling back to just using the one on the page
        if (billingObj && billingObj.methods && billingObj.methods.clearCreditCardForm) {
            billing.methods.clearCreditCardForm();
        } else {
            clearCreditCardForm();
        }
        $('.credit-card-form').removeClass('checkout-hidden');
        $('.user-payment-instruments').addClass('checkout-hidden');
    });
};

billing.cancelNewPayment = function () {
    const billingObj = this; // The billing object/module at the time the function is called

    $('.cancel-new-payment').on('click', function (e) {
        e.preventDefault();
        $('.payment-information').data('is-new-payment', false);

        // Always try and use the latest version of the method in the module, before falling back to just using the one on the page
        if (billingObj && billingObj.methods && billingObj.methods.clearCreditCardForm) {
            billing.methods.clearCreditCardForm();
        } else {
            clearCreditCardForm();
        }
        $('.user-payment-instruments').removeClass('checkout-hidden');
        $('.credit-card-form').addClass('checkout-hidden');
    });
};

module.exports = billing;

