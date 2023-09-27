'use strict';

var baseCheckout = require('base/checkout/checkout');
var addressHelper = require('./address');
var pluginBilling = require('kind/checkout/billing');
var shippingHelpers = require('./shipping');
var kindShippingHelpers = require('kind/checkout/shipping');
var formHelpers = require('./formErrors');

/**
 * Clears out transitionary changes to next stage button
 */
function resetNextStageButton() {
    $('.next-step-button button').removeAttr('disabled')
        .spinner().stop();
}

$("#donation-check-fake").on("click", function() {
    $("#donation-checkbox").click();
    if ($("#donation-checkbox").hasClass("checked")) {
        $("#donation-check-fake").prop("checked", true);
    } else {
        $("#donation-check-fake").prop("checked", false);
    }
})

$("#donation-check-fake-supersize").on("click", function() {
    $("#donation-checkbox-supersize").click();
    if ($("#donation-checkbox-supersize").hasClass("checked")) {
        $("#donation-check-fake-supersize").prop("checked", true);
    } else {
        $("#donation-check-fake-supersize").prop("checked", false);
    }
})

$(".c-cart-promo-code__form__apply-btn").on("click", function() {
});


$( document ).ready(function() {
    if ($("#donation-checkbox-supersize").hasClass("checked")) {
        $("#donation-check-fake-supersize").prop("checked", true);
    } else {
        $("#donation-check-fake-supersize").prop("checked", false);
    }
    $("#donation-check-fake-supersize").prop("checked", $("#donation-checkbox-supersize").prop("checked"));
});

/**
 * Save new/updated addresses
 *
 * @param {string} stage - Stage of checkout
 * @param {boolean} isMultiShip - Whether we're using multishipping
 */
function saveAddress(stage, isMultiShip){
    var stageName = stage;
    if (['shipping','payment'].indexOf(stageName) >= 0) {
        var $form = (stageName === 'shipping' ? $(`.${isMultiShip ? 'multi' : 'single'}-shipping #dwfrm_shipping`) : $('#dwfrm_billing'));
        var $saveForFuture = $form.find('input[name$="addressFields_saveForFuture"]');

        if (($saveForFuture.length > 0) && $saveForFuture[0].checked) {
            $.ajax({
                type: 'POST',
                url: $form.find('input[name="saveAddress"]').data('save-address-url'),
                data: newFormToNewAddress($form.serialize()),
                success: function(data) {
                    if (data.success) {
                        // Inform the user?

                        // Update the address selector options
                        var $shipmentSelector = $('select[name="shipmentSelector"],select[name="addressSelector"]', $form);
                        var address = {
                            addressId: data.addressId || '',
                            firstName: data.firstName || '',
                            lastName: data.lastName || '',
                            address1: data.address1 || '',
                            address2: data.address2 || '',
                            city: data.city || '',
                            stateCode: data.states.stateCode || '',
                            country: data.country || '',
                            postalCode: data.postalCode || '',
                            phone: data.phone || ''
                        };

                        var newOption = false; // Track whether an option exists already

                        // Update address option
                        // Even if it doesn't currently exist, we'll have an object we can insert
                        var $option = $shipmentSelector.find('option[value="ab_' + kindShippingHelpers.methods.getSaveAddressId($form) + '"]');
                        if (!$option.length) {
                            $option = $('<option value=""></option>');
                            newOption = true;
                        }

                        $option.attr('value', 'ab_' + address.addressId);
                        $option.text(address.firstName + ' ' + address.lastName + ' ' + address.address1 + ' ' + address.address2 + ' ' + address.city + ', ' + address.stateCode + ' ' + address.postalCode);
                        $option.attr('data-first-name', address.firstName);
                        $option.attr('data-last-name', address.lastName);
                        $option.attr('data-address1', address.address1);
                        $option.attr('data-address2', address.address2);
                        $option.attr('data-city', address.city);
                        $option.attr('data-state-code', address.stateCode);
                        $option.attr('data-country', address.country);
                        $option.attr('data-postal-code', address.postalCode);
                        $option.attr('data-phone', address.phone);

                        if (newOption) {
                            $shipmentSelector.append($option);
                            $shipmentSelector.val('ab_' + address.addressId);

                            // In case this is the first saved address, show the surrounding fieldset
                            $shipmentSelector.closest('fieldset').css('display','')
                                .removeClass('d-none');
                        }

                        $form.find('input[name="saveAddress"]').data('save-address-url', kindShippingHelpers.methods.getSaveAddress($form.find('select[name="shipmentSelector"],select[name="addressSelector"]').val().replace('ab_',''), $form));
                        $shipmentSelector.trigger('change');
                    }
                    else {
                        // Rename the field keys back to match this current form
                        data.fields = stageName === 'shipping' ? JSON.parse(JSON.stringify(data.fields).replace(/newaddress/gi,'shipping_shippingAddress_addressFields')) : JSON.parse(JSON.stringify(data.fields).replace(/newaddress/gi,'billing_addressFields'));
                        formValidation($form, data);

                        $('.error-message').show();
                        $('.error-message-text').text('Address could not be saved. You may continue through checkout, or click Edit by the Shipping heading to correct any issues');
                    }
                },
                error: function(err) {
                    if (err.responseJSON && err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                }
            });
        }
    }

}

/**
 * Converts form fields so that they both submit to the SFRA form "address"
 *
 * @param {string} addressForm - Serialized address form data
 */
function newFormToNewAddress(addressForm) {
    return addressForm.replace(/shipping_shippingAddress_addressFields/gi,'address')
        .replace(/billing_addressFields/gi,'address');
}

// extend complete checkout plugin as target members property is local
(function ($) {
    $.fn.checkout = function () { // eslint-disable-line
        var plugin = this;

        //
        // Collect form data from user input
        //
        var formData = {
            // Shipping Address
            shipping: {},

            // Billing Address
            billing: {},

            // Payment
            payment: {},

            // Gift Codes
            giftCode: {}
        };

        //
        // The different states/stages of checkout
        //
        var checkoutStages = [
            'shipping',
            'payment',
            'placeOrder',
            'submitted'
        ];

        /**
         * Updates the URL to determine stage
         * @param {number} currentStage - The current stage the user is currently on in the checkout
         */
        function updateUrl(currentStage) {
            history.pushState(
                checkoutStages[currentStage],
                document.title,
                location.pathname
                + '?stage='
                + checkoutStages[currentStage]
                + '#'
                + checkoutStages[currentStage]
            );
        }

        //
        // Local member methods of the Checkout plugin
        //
        var members = {

            // initialize the currentStage variable for the first time
            currentStage: 0,

            /**
             * Set or update the checkout stage (AKA the shipping, billing, payment, etc... steps)
             * @returns {Object} a promise
             */
            updateStage: function () {
                var stage = checkoutStages[members.currentStage];
                var defer = $.Deferred(); // eslint-disable-line

                if (stage === 'shipping') {
                    //
                    // Clear Previous Errors
                    //
                    formHelpers.clearPreviousErrors('.shipping-form');

                    //
                    // Submit the Shipiing Address Form
                    //
                    var isMultiShip = $('#checkout-main').hasClass('multi-ship');
                    var formSelector = isMultiShip ?
                            '.multi-shipping .active form' :
                            '.single-shipping form.shipping-form';
                    var form = $(formSelector);

                    if (isMultiShip && form.length === 0) {
                        // in case the multi ship form is already submitted
                        var url = $('#checkout-main').attr('data-checkout-get-url');
                        $.ajax({
                            url: url,
                            method: 'GET',
                            success: function (data) {
                                if (data.expressCheckout) {
                                    // skip payment
                                    members.currentStage++;
                                }
                                if (!data.error) {
                                    $('body').trigger('checkout:updateCheckoutView',
                                        { order: data.order, customer: data.customer });
                                    defer.resolve();
                                } else if ($('.shipping-nav .alert-danger').length < 1) {
                                    var errorMsg = data.message;
                                    var errorHtml = '<div class="alert alert-danger alert-dismissible valid-cart-error ' +
                                        'fade show" role="alert">' +
                                        '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                                        '<span aria-hidden="true">&times;</span>' +
                                        '</button>' + errorMsg + '</div>';
                                    $('.shipping-nav').append(errorHtml);
                                    defer.reject();
                                }
                            },
                            error: function () {
                                // Server error submitting form
                                defer.reject();
                            }
                        });
                    } else {
                        var shippingFormData = form.serialize();

                        $('body').trigger('checkout:serializeShipping', {
                            form: form,
                            data: shippingFormData,
                            callback: function (data) {
                                shippingFormData = data;
                            }
                        });

                        $.ajax({
                            url: form.attr('action'),
                            method: 'POST',
                            data: shippingFormData,
                            success: function (data) {
                                if (data.expressCheckout) {
                                    // skip payment
                                    members.currentStage++;
                                }
                                shippingHelpers.methods.shippingFormResponse(defer, data);

                                // If there were no problems, save the address
                                if (data.form.valid && !data.error && (typeof data.errorMessage === 'undefined' || !data.errorMessage ) && (typeof data.fieldErrors === 'undefined' || data.fieldErrors.length === 0)) {
                                    saveAddress(stage, isMultiShip);
                                }
                            },
                            error: function (err) {
                                if (err.responseJSON.redirectUrl) {
                                    window.location.href = err.responseJSON.redirectUrl;
                                }
                                // Server error submitting form
                                defer.reject(err.responseJSON);
                            }
                        });
                    }
                    return defer;
                } else if (stage === 'payment') {
                    //
                    // Submit the Billing Address Form
                    //

                    formHelpers.clearPreviousErrors('.payment-form');

                    var paymentForm = $('#dwfrm_billing').serialize();
                    $('body').trigger('checkout:serializeBilling', {
                        form: $('#dwfrm_billing'),
                        data: paymentForm,
                        callback: function (data) { paymentForm = data; }
                    });

                    if ($('.data-checkout-stage').data('customer-type') === 'registered') {
                        // if payment method is credit card
                        var paymentMethodID = $('.payment-information').data('payment-method-id');
                        if (['CREDIT_CARD', 'PAYMENTOPERATOR_CREDIT_DIRECT'].indexOf(paymentMethodID) > -1) {
                            if (!($('.payment-information').data('is-new-payment'))) {
                                var cvvCode = $('.saved-payment-instrument.' +
                                    'selected-payment .saved-payment-security-code').val();

                            	var $cvvField = [];
                            	$cvvField = $('.saved-payment-instrument.' +
                                        'selected-payment ' +
                                		'.form-control');
                                var regexp = new RegExp("[0-9]{" + $cvvField.attr("minlength") + "," + $cvvField.attr("maxlength") + "}$");
                                if (cvvCode === '' || ! regexp.test(cvvCode)) {
                                	$cvvField.addClass('is-invalid');
                                    defer.reject();
                                    if ($cvvField.length && $cvvField.offset()) {
	                                    var scrollTop = ($cvvField.offset().top - 150) > 0 ?
	                                            ($cvvField.offset().top - 150) : 0;
	                                    $('html, body').animate({
	                                        scrollTop: scrollTop
	                                    }, 400);
                                    }
                                    console.log(regexp.test(cvvCode));
                                   return defer;
                                }
                                console.log('after return');
                                var $savedPaymentInstrument = $('.saved-payment-instrument' +
                                    '.selected-payment'
                                );

                                paymentForm += '&storedPaymentUUID=' +
                                    $savedPaymentInstrument.data('uuid');

                                paymentForm += '&securityCode=' + cvvCode;
                            }
                        }
                    }

                    $.ajax({
                        url: $('#dwfrm_billing').attr('action'),
                        method: 'POST',
                        data: paymentForm,
                        success: function (data) {
                            // look for field validation errors
                            if (data.error) {
                                if (data.fieldErrors.length) {
                                    console.log(data.fieldErrors);
                                    data.fieldErrors.forEach(function (error) {
                                        var $form = $('#dwfrm_billing');
                                        if (Object.keys(error).length) {
                                            // Check if any of the validation errors are from
                                            // the billing address form.
                                            console.log(JSON.stringify(error));
                                            if (JSON.stringify(error).indexOf('billing_addressFields') > -1) {
                                                // Expand the billing address form.
                                                $form.attr(
                                                    'data-address-mode', 'details');
                                                $form.find(
                                                    '.multi-ship-address-actions')
                                                    .removeClass('d-none');
                                                $form.find(
                                                    '.multi-ship-action-buttons .col-12.btn-save-multi-ship')
                                                    .addClass('d-none');
                                            }

                                            formHelpers.loadFormErrors('.payment-form', error);
                                        }
                                    });
                                }

                                if (data.serverErrors.length) {
                                    data.serverErrors.forEach(function (error) {
                                        $('.error-message').show();
                                        $('.error-message-text').text(error);

                                        var scrollTop = ($('.error-message').offset().top - 150) > 0 ?
                                            ($('.error-message').offset().top - 150) : 0;
                                        $('html, body').animate({
                                            scrollTop: scrollTop
                                        }, 400);
                                    });
                                }

                                if (data.cartError) {
                                    window.location.href = data.redirectUrl;
                                }

                                defer.reject();
                            } else if (data.easycreditRedirect) {
                                window.location.href = data.easycreditRedirect;
                            } else {
                                //
                                // Populate the Address Summary
                                //
                                $('body').trigger('checkout:updateCheckoutView',
                                    { order: data.order, customer: data.customer });

                                if (data.renderedPaymentInstruments) {
                                    $('.stored-payments').empty().html(
                                        data.renderedPaymentInstruments
                                    );
                                }

                                if (data.customer.registeredUser
                                    && data.customer.customerPaymentInstruments.length
                                ) {
                                    $('.cancel-new-payment').removeClass('checkout-hidden');
                                }

                                saveAddress(stage);

                                defer.resolve(data);
                            }
                        },
                        error: function (err) {
                            if (err.responseJSON.redirectUrl) {
                                window.location.href = err.responseJSON.redirectUrl;
                            }
                        }
                    });

                    return defer;
                } else if (stage === 'placeOrder') {
                    var kountExampleVerification = $('.kount-selector').serialize();
                    $.ajax({
                        url: $('.place-order').data('action'),
                        method: 'POST',
                        data: kountExampleVerification,
                        success: function (data) {
                            if (data.error) {
                                if (data.cartError) {
                                    window.location.href = data.redirectUrl;
                                    defer.reject();
                                } else {
                                    // go to appropriate stage and display error message
                                    defer.reject(data);
                                }
                            } else {
                                var continueUrl = data.continueUrl;
                                var urlParams = {
                                    ID: data.orderID,
                                    token: data.orderToken
                                };

                                continueUrl += (continueUrl.indexOf('?') !== -1 ? '&' : '?') +
                                    Object.keys(urlParams).map(function (key) {
                                        return key + '=' + encodeURIComponent(urlParams[key]);
                                    }).join('&');

                                window.location.href = continueUrl;
                                defer.resolve(data);
                            }
                        },
                        error: function () {
                        }
                    });

                    return defer;
                }
                var p = $('<div>').promise(); // eslint-disable-line
                setTimeout(function () {
                    p.done(); // eslint-disable-line
                }, 500);
                return p; // eslint-disable-line
            },

            /**
             * Initialize the checkout stage.
             *
             * TODO: update this to allow stage to be set from server?
             */
            initialize: function () {
                // set the initial state of checkout
                members.currentStage = checkoutStages
                    .indexOf($('.data-checkout-stage').data('checkout-stage'));
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);

                //
                // Handle Payment option selection
                //
                $('input[name$="paymentMethod"]', plugin).on('change', function () {
                    $('.credit-card-form').toggle($(this).val() === 'CREDIT_CARD');
                });

                //
                // Add an event listener for triggering stage updates from outside the plugin.
                //
                $('body').on('checkout:goToStage', function (e, data) {
                    // set the initial state of checkout
                    members.currentStage = checkoutStages
                        .indexOf($('.data-checkout-stage').data('checkout-stage'));
                    $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);

                    if (data && data.stage) {
                        if (checkoutStages.indexOf(data.stage) > -1) {
                            members.gotoStage(data.stage);
                        }
                    }
                });

                //
                // Handle Next State button click
                //
                $(plugin).on('click', '.next-step-button button', function () {
                    // Disable button.  To be re-enabled after the ajax call completes
                    $(this).attr('disabled', 'disabled')
                        .spinner().start();

                    window.nextStageBtnTimeout = setTimeout(resetNextStageButton, 20000); // Just in case something goes truly wrong with the ajax, make the button accessible again after 20s

                    members.nextStage();
                });

                //
                // Handle Edit buttons on shipping and payment summary cards
                //
                $('.shipping-summary .edit-button', plugin).on('click', function () {
                    $(".checkoutsteps").html('<a id="stepcart" href="/cart">CART</a> > <b class="stepcurrent">SHIPPING</b> > PAYMENT > REVIEW');
                    members.gotoStage('shipping');
                    });

                $('.payment-summary .edit-button', plugin).on('click', function () {
                    members.gotoStage('payment');
                    $(".checkoutsteps").html('<a id="stepcart stepprev" href="/cart">CART</a> > <a id="stepship stepprev" href="checkout?stage=shipping">SHIPPING</a> > <b class="stepcurrent">PAYMENT</b> > REVIEW');
                });

                //
                // remember stage (e.g. shipping)
                //
                updateUrl(members.currentStage);

                //
                // Listen for foward/back button press and move to correct checkout-stage
                //
                $(window).on('popstate', function (e) {
                    //
                    // Back button when event state less than current state in ordered
                    // checkoutStages array.
                    //
                    if (e.state === null ||
                         checkoutStages.indexOf(e.state) < members.currentStage) {
                        members.handlePrevStage(false);
                    } else if (checkoutStages.indexOf(e.state) > members.currentStage) {
                        // Forward button  pressed
                        members.handleNextStage(false);
                    }
                });

                //
                // Set the form data
                //
                plugin.data('formData', formData);
            },

            /**
             * The next checkout state step updates the css for showing correct buttons etc...
             */
            nextStage: function (e) {
                var promise = members.updateStage();

                promise.done(function () {
                    $('body').trigger('checkout:nextStep');
                    // Update UI with new stage
                    members.handleNextStage(true);
                });

                promise.fail(function (data) {
                    // show errors
                    if (data) {
                        if (data.errorStage) {
                            members.gotoStage(data.errorStage.stage);

                            if (data.errorStage.step === 'billingAddress') {
                                var $billingAddressSameAsShipping = $(
                                    'input[name$="_shippingAddressUseAsBillingAddress"]'
                                );
                                if ($billingAddressSameAsShipping.is(':checked')) {
                                    $billingAddressSameAsShipping.prop('checked', false);
                                }
                            }
                        }

                        if (data.errorMessage) {
                            $('.error-message').show();
                            $('.error-message-text').text(data.errorMessage);
                        }
                    }
                });
            },

            /**
             * The next checkout state step updates the css for showing correct buttons etc...
             *
             * @param {boolean} bPushState - boolean when true pushes state using the history api.
             */
            handleNextStage: function (bPushState) {
                if (members.currentStage < checkoutStages.length - 1) {
                    // move stage forward
                    members.currentStage++;

                    //
                    // show new stage in url (e.g.payment)
                    //
                    if (bPushState) {
                        updateUrl(members.currentStage);
                    }
                }

                // Set the next stage on the DOM
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            },

            /**
             * Previous State
             */
            handlePrevStage: function () {
                if (members.currentStage > 0) {
                    $(".next-step-button").removeClass("placeorder");
                    // move state back
                    members.currentStage--;
                    updateUrl(members.currentStage);
                }

                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            },

            /**
             * Use window history to go to a checkout stage
             * @param {string} stageName - the checkout state to goto
             */
            gotoStage: function (stageName) {
                members.currentStage = checkoutStages.indexOf(stageName);
                updateUrl(members.currentStage);
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            }
        };

        //
        // Initialize the checkout
        //
        members.initialize();

        return this;
    };
}(jQuery));

[addressHelper, shippingHelpers, pluginBilling].forEach(function (library) {
    Object.keys(library).forEach(function (key) {
        if (typeof library[key] === 'object') {
            baseCheckout[key] = Object.assign({}, baseCheckout[key], library[key]);
        } else {
            baseCheckout[key] = library[key];
        }
    });
});

if (!baseCheckout.methods) {
    baseCheckout.methods = {};
}

baseCheckout.giftRequirements = function () {
    $('body')
        .on('change', '.js-gift-to-input, .js-gift-from-input, .js-gift-message-input', function () {
            const $giftMessage = $('.js-gift-message-input');
            const $giftTo = $('.js-gift-to-input');
            const $giftFrom = $('.js-gift-from-input');

            if ($giftMessage.val() || $giftTo.val() || $giftFrom.val()) {
                if (!$(this).prop('required')) {
                    $giftTo.prop('required', true)
                        .closest('.js-form-group').addClass('required');
                    $giftFrom.prop('required', true)
                        .closest('.js-form-group').addClass('required');
                    $giftMessage.prop('required', true)
                    .closest('.js-form-group').addClass('required');
                }
            } else {
                $giftTo.prop('required', false)
                    .closest('.js-form-group').removeClass('required');
                $giftFrom.prop('required', false)
                    .closest('.js-form-group').removeClass('required');
                $giftMessage.prop('required', false)
                .closest('.js-form-group').removeClass('required');
            }
        });
}

// Add functionality to the "add new" button to work with saving/updating addresses
baseCheckout.addNewAddressCustom = function () {
    $('.btn-add-new').on('click', function(e){
        var $form = $(this).closest('form');
        // clearFormErrors();
        $form.find('.form-control-label.is-invalid').removeClass('is-invalid');
        $form.find('.form-control.is-invalid').removeClass('is-invalid');

        $form.find('input[name$="addressFields_saveForFuture"]').prop('checked',true);
        $form.find('input[name="saveAddress"]').attr('data-save-address-url', kindShippingHelpers.methods.getSaveAddress('', $form));
    });
};

baseCheckout.methods.resetNextStageButton = resetNextStageButton

baseCheckout.ajaxComplete = function () {
    var baseObj = this;

    $(document).ajaxComplete(function () {
        if (baseObj.methods && baseObj.methods.resetNextStageButton) {
            baseObj.methods.resetNextStageButton();
        } else {
            resetNextStageButton();
        }
    });
}

module.exports = baseCheckout;
