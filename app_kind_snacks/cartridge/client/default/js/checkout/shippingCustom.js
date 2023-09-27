'use strict';

/**
 * Adds on functionality for handling custom data onto the base SFRA
 */

/**
 * Handles failures to setup the checkout for an Express Checkout payment method
 * like PayPal Express. This mirrors the logic in checkout.js method:
 *  - members.nextStage()
 *
 * @param {Object} data - A data Object that was returned in the rejection of
 *      the deferred when inside of the validateExpressCheckoutAddress() method.
 */

$(".submit-shipping").on('click', function () {
    $(".btn-show-details").click();
});

function handleExpressFailure(data) {
    // show errors
    if (data) {
        if (data.errorStage) {
            if (data.errorStage.step === 'billingAddress') {
                var $billingAddressSameAsShipping = $(
                    'input[name$="_shippingAddressUseAsBillingAddress"]'
                );
                if ($billingAddressSameAsShipping.is(':checked')) {
                    $billingAddressSameAsShipping.prop('checked', false);
                }
            }
        }

        if (data.errorMessage || data.message) {
            var msg = data.errorMessage || data.message;
            $('.error-message').show();
            $('.error-message-text').text(msg);
        }
    }
}

/**
 * updates the shipping address form values of custom fields within shipping forms
 * @param {Object} e - the event object
 * @param {Object} data - the data from the event trigger
 */
function updateCustomShippingAddressFormValues(e, data) {
    const addressObject = $.extend({}, data.shipping.shippingAddress);

    addressObject.email = data.shipping.email || null;
    addressObject.companyName = data.shipping.companyName || null;
    addressObject.isGift = !!data.shipping.giftTo || !!data.shipping.giftFrom || false;
    addressObject.giftTo = data.shipping.giftTo || null;
    addressObject.giftFrom = data.shipping.giftFrom || null;

    $('input[value=' + data.shipping.UUID + ']').each(function (formIndex, el) {
        var form = el.form;
        if (!form) return;

        if (addressObject.email) {
            $('input[name$=_email]', form).val(addressObject.email);
        }
        if (addressObject.companyName) {
            $('input[name$=_companyName]', form).val(addressObject.companyName);
        }
        $('input[name$=_giftTo]', form).val(addressObject.giftTo ? addressObject.giftTo : $('input[name$=_giftTo]', form).val() || ''); // Don't blank out gift fields
        $('input[name$=_giftFrom]', form).val(addressObject.giftFrom ? addressObject.giftFrom : $('input[name$=_giftFrom]', form).val() || ''); // Don't blank out gift fields
    });
}

/**
 * updates the shipping method radio buttons within shipping forms with unique ids
 * @param {Object} e - the event object
 * @param {Object} data - the data from the event trigger
 */
function makeShippingMethodIdsUnique(e, data) {
    const shipping = data.shipping;

    var uuidEl = $('input[value=' + shipping.UUID + ']');
    if (uuidEl && uuidEl.length > 0) {
        $.each(uuidEl, function (shipmentIndex, el) {
            var form = el.form;
            if (!form) return;

            var $shippingMethodList = $('.shipping-method-list', form);

            if ($shippingMethodList && $shippingMethodList.length > 0) {
                var shippingMethods = shipping.applicableShippingMethods;

                //
                // Create the new rows for each shipping method
                //
                $.each(shippingMethods, function (methodIndex, shippingMethod) {
                    // set input
                    $(`input#shippingMethod-${shippingMethod.ID}`, $shippingMethodList)
                        .prop('id', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID.substr(0, 5));

                    $(`label[for=shippingMethod-${shippingMethod.ID}]`, $shippingMethodList)
                        .prop('for', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID.substr(0, 5));
                });
            }
        });
    }
}

/**
 * Update the read-only portion of the shipment display (per PLI) for custom fields
 * @param {Object} e - the event object
 * @param {Object} data - the data from the event trigger
 */
function updateCustomPLIShippingSummaryInformation(e, data) {
    var shipping = data.shipping;
    var productLineItem = data.productLineItem;

    var $pli = $('input[value=' + productLineItem.UUID + ']');
    var form = $pli && $pli.length > 0 ? $pli[0].form : null;

    if (!form) return;

    var $viewBlock = $('.view-address-block', form);

    var tmpl = $viewBlock;

    var email = shipping.email;

    $('.ship-to-email', tmpl).text(email);

    if (!email) {
        $('.ship-to-email', tmpl).hide();
    }

    var companyName = shipping.companyName;

    $('.ship-to-companyName', tmpl).text(companyName);
    if (!companyName) {
        $('.ship-to-companyName', tmpl).hide();
    }

    if (shipping.isGift) {
        if (shipping.giftTo || shipping.giftFrom) {
            var $label = $('.js-gift-summary-label', tmpl);
            $label.removeClass('d-none');

            if (shipping.giftFrom) {
                $label.prepend($('.js-gift-from', $label).html() + ': ' + shipping.giftFrom + 'second');
            }
            if (shipping.giftTo) {
                $label.prepend($('.js-gift-to', $label).html() + ': ' + shipping.giftTo + ' ');
            }
        }
    }

    $viewBlock.html(tmpl.html());
}

/**
 * Updates shipping summary for custom fields
 * @param {Object} e - the event object
 * @param {Object} data - the data from the event trigger
 */
function updateCustomShippingSummaryInformation(e, data) {
    var shipping = data.shipping;
    $('[data-shipment-summary=' + shipping.UUID + ']').each(function (i, el) {
        var $container = $(el);
        var $shippingEmail = $container.find('.shipping-email');
        var $companyName = $container.find('.companyName');
        var giftMessageSummary = $container.find('.gift-summary');

        var address = shipping.shippingAddress;
        var isGift = shipping.isGift;

        if (isGift) {
            giftMessageSummary.find('.gift-message-summary').text(shipping.giftMessage);
            giftMessageSummary.removeClass('d-none');

            var $label = $('.js-gift-summary-label', giftMessageSummary);
            var labelText = '';

            if ($('.js-gift-to', $label).length && shipping.giftTo) {
                labelText += $('.js-gift-to', $label).html() + ': ' + shipping.giftTo + ' ';
            }
            if ($('.js-gift-from', $label).length && shipping.giftFrom) {
                labelText += $('.js-gift-from', $label).html() + ': ' + shipping.giftFrom;
            }

            $label.find('.js-gift-summary-label-content').html(labelText);
        }

        if (address && address.email) {
            $shippingEmail.text(address.email);
        } else {
            $shippingEmail.empty();
        }
        if (address && address.companyName) {
            $companyName.text(address.companyName);
        } else {
            $companyName.empty();
        }
    });
}

/**
 * Clears form data for custom fields
 * @param {Object} e - the event object
 * @param {Object} data - the data from the event trigger
 */
function clearCustomShippingFormFields(e, data) {
    const order = data.order;

    order.shipping.forEach(function (shipping) {
        $('input[value=' + shipping.UUID + ']').each(function (formIndex, el) {
            var form = el.form;
            if (!form) return;

            $('input[name$=_giftTo]', form).val(null);
            $('input[name$=_giftFrom]', form).val(null);
        });
    });
}

/**
 * Clears form data for custom fields
 * @param {Object} e - the event object
 * @param {Object} data - the data from the event trigger
 */
function customToggleMultiShip(e, data) {
    if (!data) {
        return;
    }

    const order = data.data.order;

    order.shipping.forEach(function (shipping) {
        $('input[value=' + shipping.UUID + ']').each(function (formIndex, el) {
            var form = el.form;
            if (!form) return;

            $('input[name$=_giftTo]', form).val(null);
            $('input[name$=_giftFrom]', form).val(null);
        });
    });
    location.reload();
}

/**
 * A function for submitting the shipping form and binding the address
 * verification method to the response if the user is comming from an Express
 * checkout page.
 */
function validateExpressCheckoutAddress() {
    // eslint-disable-next-line
    var defer = $.Deferred();
    const SmartyStreets = require('./smartyStreets');

    // Cache references to DOM.
    const $chkOutMain = $('#checkout-main');
    const $placeOrderBtn = $chkOutMain.find('button.place-order');
    const $form = $chkOutMain.find('.single-shipping form.shipping-form');

    // Disable the place order button until verified.
    $placeOrderBtn.attr('disabled', true);

    var shippingFormData = $form.serialize();
    $('body').trigger('checkout:serializeShipping', {
        form: $form,
        data: shippingFormData,
        callback: function (callbackData) {
            shippingFormData = callbackData;
        }
    });

    $.ajax({
        url: $form.attr('action'),
        type: 'post',
        data: shippingFormData,
        success: function (responseData) {
            // eslint-disable-next-line
            SmartyStreets.handleShippingFormResponse(defer, responseData);
        },
        error: function (err) {
            if (err.responseJSON.redirectUrl) {
                window.location.href = err.responseJSON.redirectUrl;
            }

            handleExpressFailure(err);
        }
    });

    // Handle Defer.resolve() calls.
    defer.done(function (data) {
        $placeOrderBtn.attr('disabled', false);
        $('body').trigger('checkout:goToStage', { stage: 'placeOrder' });
        $('body').trigger('checkout:updateCheckoutView',
            { order: data.order, customer: data.customer });
    });

    // Handle Defer.reject() calls.
    defer.catch(function (failData) {
        $('body').trigger('checkout:goToStage', { stage: 'shipping' });
    });
}

/**
 * A helper function to get the data attribute from the checkout container
 * element and check if this is an express checkout session.
 *
 * @returns {boolean} - Returns true if the user is returning from an express
 *      checkout site for payment, and false for all other payment types.
 */
function checkForExpressCheckout() {
    // Cache references to DOM.
    let isExpress = false;
    let isRefTrans = false;
    const $chkOutMain = $('#checkout-main');

    // Check the data attribute that indicates PayPal Express.
    if ($chkOutMain.length && typeof $chkOutMain.data() !== 'undefined') {
        const checkoutData = $chkOutMain.data();
        isExpress = typeof checkoutData !== 'undefined' &&
            typeof checkoutData.checkoutExpressCheckout !== 'undefined' &&
            checkoutData.checkoutExpressCheckout !== false;

        isRefTrans = typeof checkoutData !== 'undefined' &&
            typeof checkoutData.checkoutReferenceTransaction !== 'undefined' &&
            checkoutData.checkoutReferenceTransaction !== false;
    }

    return isExpress || isRefTrans;
}

module.exports = {
    init: function () {
        const $body = $('body');

        $body.on('shipping:updateShippingAddressFormValues', updateCustomShippingAddressFormValues);
        $body.on('shipping:updateShippingMethods', makeShippingMethodIdsUnique);
        $body.on('shipping:updatePLIShippingSummaryInformation', updateCustomPLIShippingSummaryInformation);
        $body.on('shipping:updateShippingSummaryInformation', updateCustomShippingSummaryInformation);
        $body.on('shipping:clearShippingForms', clearCustomShippingFormFields);
        $body.on('shipping:selectMultiShipping', customToggleMultiShip);
        $body.on('shipping:selectSingleShipping', customToggleMultiShip);

        // Checks if this is an express checkout session then makes a call to
        // validate the returned address.
        if (checkForExpressCheckout()) {
            validateExpressCheckoutAddress();
        }
    }
};
