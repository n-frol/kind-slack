/* eslint-disable */
'use strict';

var processInclude = require('base/util');
const { is } = require('bluebird');

$(".submit-shipping").on('click', function () {
    $(".btn-show-details").click();
});

$(document).ready(function () {
    console.log("ready!");
    processInclude(require('int_computop/checkout/checkout'));
    processInclude(require('./checkout/checkoutCustom'));
    processInclude(require('./checkout/addressCustom'));
    processInclude(require('./checkout/shippingCustom'));
    if (window.dw &&
        window.dw.applepay &&
        window.ApplePaySession &&
        window.ApplePaySession.canMakePayments()) {
        $('body').addClass('apple-pay-enabled');
    }

});
$(document).ajaxComplete(function (event, xhr, settings ) {
    $(".next-step-button .place-order:visible").parent().parent().addClass("placeorder");
    if (event.currentTarget.URL.includes("placeOrder") ||
    settings.url.includes("AddCoupon") ||
    settings.url.URL.includes("RemoveCoupon") ||
    settings.url.URL.includes("ChangeUp")) {
        $(".sumcard").addClass("is-active");
     } else {
        $(".sumcard").removeClass("is-active");
     }
    if (event.currentTarget.URL.includes("placeOrder"))
    {
        console.log("placeOrder");
    }
});
$(document).ajaxComplete(function (event, xhr, settings) {
    if (event.currentTarget.URL.includes("placeOrder")) {
        $(".checkoutPromo").hide();
        $(".s-idme--checkout").hide();
    } else {
        $(".checkoutPromo").show();
        $(".s-idme--checkout").show();
    }
});
