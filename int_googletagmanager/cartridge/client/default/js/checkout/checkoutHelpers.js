/* global $, dataLayer, dataLayerCheckout */
'use strict';


/**
 * Report the current checkout stage
 *
 */
function reportCheckoutStage() {
    if (typeof dataLayer === 'undefined' || typeof dataLayerCheckout === 'undefined') {
        return;
    }

    var stageName = $('.data-checkout-stage').attr('data-checkout-stage');

    if (['shipping', 'payment', 'placeOrder'].indexOf(stageName) >= 0 && typeof dataLayerCheckout !== 'undefined') {
        var stepNumber;
        if (stageName === 'shipping') {
            stepNumber = 2;
        } else if (stageName === 'payment') {
            stepNumber = 3;
            dataLayerCheckout.ecommerce.checkout.actionField.option = $('.payment-information').data('payment-method-id');
        } else {
            stepNumber = 4;
            delete dataLayer.ecommerce.checkout.actionField.option;
        }

        dataLayerCheckout.step = stepNumber;
        dataLayerCheckout.ecommerce.checkout.actionField.step = stepNumber;
        dataLayer.push(dataLayerCheckout);
    }
}


module.exports = {
    methods: {
        reportCheckoutStage: reportCheckoutStage
    }
};

