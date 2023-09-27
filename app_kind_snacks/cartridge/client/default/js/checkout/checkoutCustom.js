/* eslint-disable */
/* global dataLayer dataLayerCheckout */
'use strict';

document.body.addEventListener("yotpoLoyaltyDiscountApplied", function (e) {
    $("#couponCode").val(e.detail.discountCode);
    $(".promo-code-btn").click();
});

$(document).ready(function () {
    if ($(window).width() < 769) {
        $(".desklogin").remove();
        $(".deskcreate").remove();
    } else {
        $(".loginmodal").remove();
        $(".createmodal").remove();
        $(".sumcard").removeClass("collapsible");
    }
});

function initCheckoutStage() {
    // Report step 2 (shipping) on initial page load
    var stageName = $('.data-checkout-stage').attr('data-checkout-stage');
    if (stageName === 'shipping' && typeof dataLayerCheckout !== 'undefined') {
        dataLayerCheckout.step = 2;
        dataLayerCheckout.ecommerce.checkout.actionField.step = 2;
        dataLayer.push(dataLayerCheckout);
    }

    // Hide MS if enabled, and BYOB is in basket
    var isBYOB = $('.product-summary-block').find('.c-product-card[data-is-byob-master=true]').is('*');
    var msEnabled = $('.st-checkout-shipping__multi-box').is('*');
    if (isBYOB && msEnabled) {
        $('.st-checkout-shipping__multi-box').addClass('d-none');
    }
}

function reportCheckoutStage() {
    var stageName = $('.data-checkout-stage').attr('data-checkout-stage');

    if (['shipping', 'payment', 'placeOrder'].indexOf(stageName) >= 0 && typeof dataLayerCheckout !== 'undefined') {
        var stepNumber = 4;

        // when shipping step is completed, report payment.
        // when payment step is completed, report placeOrder.
        if (stageName === 'shipping') {
            stepNumber = 3;
            dataLayerCheckout.payment_method = $('.payment-information').data('payment-method-id');
            dataLayerCheckout.ecommerce.checkout.actionField.option = $('.payment-information').data('payment-method-id');
        } else if (stageName === 'payment') {
            stepNumber = 4;
            dataLayerCheckout.ecommerce.checkout.actionField.option = null;
        }

        dataLayerCheckout.step = stepNumber;
        dataLayerCheckout.ecommerce.checkout.actionField.step = stepNumber;
        dataLayer.push(dataLayerCheckout);
    }
}

function updateBreadcrumbs() {
    var stageName = $('.data-checkout-stage').attr('data-checkout-stage');
    if (stageName === 'shipping') {
        $(".checkoutsteps").html('<a id="stepcart" class="stepprev" href="/cart">CART</a> > <a id="stepship" class="stepprev" href="checkout?stage=shipping">SHIPPING</a> > <b class="stepcurrent">PAYMENT</b> > REVIEW');
    } else if (stageName === 'payment') {
        $(".checkoutsteps").html('<a id="stepcart" class="stepprev" href="/cart">CART</a> > <a id="stepship" class="stepprev" href="checkout?stage=shipping">SHIPPING</a> > <a id="steppay" class="stepprev" href="checkout?stage=payment">PAYMENT</a> > <b class="stepcurrent">REVIEW</b>');
    }
}

/* function checkPayOnAccountStatus
* Do a quick check on UI in case additional front end messaging is needed.
*/
function checkPayOnAccountStatus() {
    return $('#payonaccount-content').is('*') && $('#payonaccount-content').hasClass('is-approved');
}

module.exports = {
    init: function () {
        initCheckoutStage();
        $('body').on('checkout:nextStep', function () {
            reportCheckoutStage();
            updateBreadcrumbs();

            // Scroll the page to the top at each new step
            // Scroll up regardless of window width and scrolling behavior
            $(window).scrollTop(0);
            $('body').animate({ scrollTop: 0 }, 250); // When possible, animate scroll to transition better
        });

        $('.shipping-method-list').change(function () {
            var methodID = $(':checked', this).val();

            dataLayer.push({
                shipping_method: methodID,
                event: 'checkout',
                ecommerce: {
                    checkout: {
                        actionField: { step: 2, option: methodID }
                    }
                }
            });
        });

        $('.payment-options .nav-item').on('click', function (e) {
            var methodID = $(this).data('method-id');
            dataLayer.push({
                event: 'checkout',
                payment_method: methodID,
                ecommerce: {
                    checkout: {
                        actionField: { step: 3, option: methodID }
                    }
                }
            });
            $('.submit-payment').attr('disabled', false);
            if (methodID === 'PAYONACCOUNT' && !checkPayOnAccountStatus()) {
                $('.submit-payment').attr('disabled', true);
            }
        });
    }
};

$(".checkout-create-mobile").on("click", function () {
    $(".createmodal").modal('show');
    $(".loginmodal").modal('hide');
});

$(".checkout-login-mobile").on("click", function () {
    $(".createmodal").modal('hide');
    $(".loginmodal").modal('show');
});

function closesummary()
{
    $(".thesummary").click();
}

$(".loginradius-submit").click(function () {
    if ($(".loginradius-error").text() !== "") {
        console.log("ERROR");
    }
});
