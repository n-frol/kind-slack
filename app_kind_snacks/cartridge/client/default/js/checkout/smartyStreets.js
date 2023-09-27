/* global dataLayer */
'use strict';

/**
 * smartyStreets.js
 *
 * Provides address verification functionality through the smarty-streets API
 * for the int_smartystreets integration cartridge.
 *
 * @module smartyStreets
 */

var formHelpers = require('./formErrors');

/**
 * Adds the necessary UUID field to the shipping form form so that the address
 * can be identified if it has already been run through the SS API.
 */
function appendSSShippingData() {
    var $uuidInput = $('input[name=address_uuid]');

    // After serializing the form, remove the UUID input
    // from the form.
    if ($uuidInput.length) {
        $uuidInput.remove();
    }
}

/**
 * Creates markup for displaying a single line of an address.
 *
 * @param {string[]} fields - An array with the names of the address fields that
 *      should be included in this address line. They will be rendered in the
 *      order that they are passed in.
 * @param {Object} address - The address object literal.
 * @returns {string} - Returns a string of markup for the address line that can
 *      be added to the UI.
 */
function getAddressLineHtml(fields, address) {
    var lineIsEmpty = true;
    fields.forEach(function (name) {
        if (typeof address[name] !== 'undefined' && address[name] !==
            '') {
            lineIsEmpty = false;
        }
    });

    // If all the fields in the array are empty, then return an empty string,
    // otherwise return the template literal for an address row markup.
    var result = lineIsEmpty ? '' :
        `<div class="modal-address-row">
            ${fields.map(function (field) {
                return `
                    <span class="modal-address-${field} ${field}">
                        ${!address[field] ? '' : address[field]}
                    </span>`;
            }).join('')}
        </div>`;

    return result;
}

/**
 * Gets an HTML string of a series of data attributes for the given address.
 * Can be used to append to an existing string
 *
 * @param {Object} address - The address object returned from a call to the
 *      address verification service smartystreets.http when submitting a
 *      shipping address.
 * @param {string} [dataHtml] - Optional string to append to
 *      returned by the server when submitting an address that could not be
 *      verified by the address verification service.
 * @returns {string} - Returns HTML string that makes a button to select a
 *      particular address.
 */
function getAddressDataFields(address, dataHtml) {
    var dataHtmlEditable = dataHtml || '';
    var keyMap = {
        address1: 'data-address1',
        address2: 'data-address2',
        city: 'data-city',
        state: 'data-state-code',
        postalCode: 'data-postal-code',
        type: 'data-type',
        UUID: 'data-uuid'
    };

    // Loop through the address keys, and create a matching data attribute
    // for each field. These data attributes are added to the button markup and
    // will be used to populate the form if the user selects this address.
    if (address) {
        Object.keys(address).forEach(function (key) {
            if (keyMap[key]) {
                dataHtmlEditable += ' ' + keyMap[key] + '="' + address[key] + '"';
            }
        });
    }

    return dataHtmlEditable;
}

/**
 * Gets an HTML string of a button for the address passed, containing data
 * attributes with the individual address field values that can be used to
 * submit the address to the server if selected by the user.
 *
 * @param {Object} address - The address object returned from a call to the
 *      address verification service smartystreets.http when submitting a
 *      shipping address.
 * @param {Object} resources - Object with key/value pairs for resources
 *      returned by the server when submitting an address that could not be
 *      verified by the address verification service.
 * @returns {string} - Returns HTML string that makes a button to select a
 *      particular address.
 */
function getButtonHtml(address, resources) {
    var dataHtml = getAddressDataFields(address);
    var btnText = typeof address.type !== 'undefined' &&
        address.type === 'edit' ? resources.edit : resources.continue;
    var jsClass = address.type !== 'undefined' && address.type !== 'edit' ?
        'js-select-address' : 'js-edit-address';

    // Create the button markup.
    var btnHtml = `
        <button class="btn btn-primary c-address-verification__btn ${jsClass}" ${dataHtml}>
            ${btnText}
        </button>`;

    return btnHtml;
}

/**
 * Populates the matching form fields with the data attribute values from the
 * passed in JQuery element.
 *
 * @param {JQuery} $addressBtn - A JQuery element that has data attributes for
 *      each address field to set and a UUID data attribute representing the
 *      address that has already been validated by the server.
 * @param {JQuery} $form - A JQuery reference to the address form.
 */
function setFormAddress($addressBtn, $form) {
    // Create a new hidden input to hold the created address UUID.
    var uuid = typeof $addressBtn !== 'undefined' &&
        $addressBtn.length && $addressBtn.data('uuid') ?
        $addressBtn.data('uuid') : '';
    var $uuid = $('<input name="address_uuid" id="address_uuid" ' +
        'type="hidden" value="' + uuid + '"/>');

    // Add the new input to the form.
    $form.append($uuid);
    var address = $addressBtn.data();

    Object.keys(address).forEach(function (key) {
        // Set the matching form field value before submitting the form.
        if (key !== 'type' && key !== 'uuid') {
            var selector = '';

            // Get the selector to the matching form field.
            if (key !== 'stateCode') {
                selector = 'input[name$=_' + key + ']';
            } else {
                selector = 'select[name$=_' + key + ']';
            }

            // Get the JQuery ref for the form input/select element.
            var $el = $form.find(selector);
            if ($el.length) {
                // Set the value of the form element.
                $el.val(address[key]);
            }
        }
    });
}

/**
 * Shows a modal indicating that the address entered could not be validated.
 * The user is then asked to select an address option. The options displayed for
 * the customer will vary depending on what is in the cart.
 * Options can be any of the following:
 *      - validated/suggested address.
 *      - edit the currently entered address.
 *      - use current, unvalidated address.
 *
 * @param {Object[]} suggested - An array of suggested addresses. If allowed
 *      the currently entered address will be included.
 * @param {Object} resources - An object with key/value pairs for each needed
 *      text resource that displays in the modal.
 * @param {JQuery} form - The JQuery element reference to the submitted form.
 * @param {function(string): void} callback - A callback function for calling
 * the defered object's resolve or reject functions.
 * @param {boolean} status - Optional boolean to determine if the service call was successful
 *
 */
function showSelectAddressModal(suggested, resources, form, callback, status) {
    // Defines how the address should be displayed. Each of the inner arrays
    // notes which fields will be displayed on that address line.
    var structure = [
        ['addressee'],
        ['address1'],
        ['address2'],
        ['city', 'state', 'postalCode']
    ];

    // Cache JQuery Elements
    var $plugin = $('#checkout-main');
    var checkoutStage = $plugin.attr('data-checkout-stage');
    var $placeOrderBtn = [];

    if (checkoutStage && checkoutStage === 'placeOrder') {
        $placeOrderBtn = $plugin.find('button.place-order');
        if ($placeOrderBtn.length) {
            $placeOrderBtn.attr('disabled', true);
        }
    }

    var $addSelectModal = $('.js-select-address-modal').clone();
    var $noSuggestedInstructions = $addSelectModal.find(
        '.js-instructions-address-unverified');
    var $defaultInstructions = $addSelectModal.find(
        '.js-instructions-address-verification');
    var $userMustEditInstructions = $addSelectModal.find(
        '.js-instructions-address-not-allowed');
    var $cannotValidateAddressInstructions = $addSelectModal.find(
        '.js-instructions-address-cannot-validate');
    var userMustEdit = suggested.length === 1 &&
        suggested[0].type === 'readonly';
    var suggestedAddressReturned = false;
    var defaultAddress;
    var success = (typeof status !== 'undefined' && status !== null) ? status : true;

    // Populate modal
    var $addressTypes = $addSelectModal.find('.js-select-address-types');

    $addressTypes.html(suggested.map(function (add, i) {
        if (add.type === 'suggestion') {
            // If there is a suggested address we use that as the default option.
            suggestedAddressReturned = true;
            defaultAddress = add;
        } else if (i === 0) {
            // Set the first returned address as the fallback default option.
            defaultAddress = add;
        }

        return `
        <div class="address col-md-6">
            <h3 class="summary-section-label shipping-addr-label h4">
                ${add.label}
            </h3>
            <input type="radio" value="${add.type}" id="address-type_${add.type}" name="address-type" ${getAddressDataFields(add)} ${add.type === 'suggestion' || suggested.length === 1 ? 'checked' : ''} />
            <label for="address-type_${add.type}" class="label--large">
                ${structure.map(function (fieldsArray) {
                    return getAddressLineHtml(fieldsArray, add);
                }).join('')}
            </label>
        </div>`;
    }).join(''));

    // Add action buttons and hide the un-used instructions asset.
    var $addressModalFooter = $addSelectModal.find('.js-street-address-modal-footer');
    switch (true) {
        case suggestedAddressReturned:
            $noSuggestedInstructions.hide();
            $userMustEditInstructions.hide();
            $cannotValidateAddressInstructions.hide();
            break;
        case !success:
            $noSuggestedInstructions.hide();
            $userMustEditInstructions.hide();
            $defaultInstructions.hide();
            break;
        case !userMustEdit:
            $userMustEditInstructions.hide();
            $defaultInstructions.hide();
            $cannotValidateAddressInstructions.hide();
            break;
        default:
            $defaultInstructions.hide();
            $noSuggestedInstructions.hide();
            $cannotValidateAddressInstructions.hide();
    }

    // If the user is allowed to continue, add the continue button.
    if (!userMustEdit) {
        $addressModalFooter.html(getButtonHtml(defaultAddress, resources));
    }

    $addressModalFooter.append(getButtonHtml({ type: 'edit' }, resources));
    var $addSelectBtn = $addSelectModal.find(
        '.js-select-address, .js-edit-address');

    // Un-bind & bind handler method to the edit and continue and buttons.
    $addSelectBtn.off('click.ss');
    $addSelectBtn.on('click.ss',
        function (e) {
            // Cache a reference to the HTML form.
            var $this = $(this);
            $this.attr('disabled', true);
            var $form = !form ? $('form[name$=_shipping]') : form;
            var $modal = $this.closest('.js-select-address-modal');
            $('.js-submit-shipping').attr('disabled', 'disabled'); // Disable button until ajax can complete so customer can't skip steps
            window.nextStageBtnTimeout = setTimeout(function () {
                $('.js-submit-shipping').removeAttr('disabled');
            }, 20000); // Set timeout to re-enable button just in case something goes wrong
            $form.spinner().start();

            // Get the data-type attribute value from the buton.
            var type = $this.data('type') ? $this.data('type') : 'edit';

            // Set the form address to be submitted.
            if (type !== 'edit') {
                setFormAddress($this, $form);
            }

            // Stop progress indicator and remove modal.
            $modal.modal('hide');
            $modal.remove();

            // If on the place-order step of checkout, re-enable the place-order
            // button so the order can be submitted.
            if ($placeOrderBtn.length) {
                $placeOrderBtn.attr('disabled', false);
            }

            // Call the callback with the button type to trigger the proper
            // action from the button click.
            /** @see getModalActionCallbackHandler */
            callback(type);
        }
    );

    // Bind a handler for selecting an address on the modal.
    $('body').off('change.ss');
    $('body').on('change.ss', '.js-select-address-types', function () {
        var $modal = $(this).closest('.js-select-address-modal');
        var $selected = $(this).find('input:checked');

        $modal.find('.js-select-address').data($selected.data());
    });

    // Add an event handler for the close button to remove the modal since the
    // default modal code does not do this.
    var $closeBtn = $addSelectModal.find('.js-modal-dialog-destroy .close');

    if ($closeBtn.length) {
        $closeBtn.on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var $this = $(this);
            var $modal = $this.closest('.js-select-address-modal');

            // Stop progress indicator and remove modal.
            $modal.modal('hide');
            $modal.remove();

            callback('edit');
        });
    }

    // Add a callback handler for clicks to the modal backdrop which also closes
    // and removes the modal.
    $('body').off('click.ss');
    $('body').on('click.ss', '.js-select-address-modal', function (e) {
        if (e.target === this) {
            e.preventDefault();
            e.stopPropagation();
            var $modal = $(this).closest('.js-select-address-modal');

            // Stop progress indicator and remove modal.
            $modal.modal('hide');
            $modal.remove();

            callback('edit');
        }
    });

    // Show the progress indicator, and add the modal to the page.
    $('body').append($addSelectModal.modal('show').removeClass('d-none'));

    if (typeof dataLayer !== 'undefined') {
        dataLayer.push({
            event: 'address-validation'
        });
    }
}

/**
 * Used to resubmit the shipping address form after the user selects to update
 * the address that they are using with the suggested address from the Smarty-
 * Streets API call.
 *
 * @param {JQueryDeferred} defer - The jQuery deferred Object that can be
 */
function resubmitSuggestedShippingAddress(defer) {
    var isMultiShip = $('#checkout-main').hasClass('multi-ship');
    var formSelector = isMultiShip ?
        '.multi-shipping .active form' : '.single-shipping .shipping-form';
    var form = $(formSelector);
    var shippingFormData = form.serialize();

    $.ajax({
        url: form.attr('action'),
        type: 'post',
        data: shippingFormData,
        success: function (data) {
            // eslint-disable-next-line
            handleShippingFormResponse(defer, data);

            clearTimeout(window.nextStageBtnTimeout);
            $('.js-submit-shipping').removeAttr('disabled');
            $.spinner().stop();
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

/**
 * @callback - Defines callback options for handling what
 *      happens after the modal window gets closed.
 * @param {Deferred} defer - The JQuery Deferred to resolve/reject to determine
 *      the next checkout action.
 * @param {Object} data - An object literal to hold the data.
 * @returns {function} - Returns the curried callback function for handling the
 *      user input from the select address modal.
 */
function getModalActionCallbackHandler(defer, data) {
    var grandTotalDecimal = data.order.totals.grandTotalDecimal;
    var $plugin = $('#checkout-main');
    var isExpress = $plugin.data('checkoutExpressCheckout');
    var isReferenceTransaction = $plugin.data('checkoutReferenceTransaction');

    return function (action) {
        var currentStage = $plugin.attr('data-checkout-stage');

        if (action === 'edit') {
            // If the user was directed back to the shipping due to an unrecognized
            // address, and this is a PP Express or PP Ref. Transaction, then
            // send to the shipping stage.
            if (currentStage && currentStage === 'shipping' && (isExpress || isReferenceTransaction)) {
                $('body').trigger('checkout:goToStage', { stage: 'shipping' });
            } else if (data) {
                defer.reject(data);
            } else {
                defer.reject();
            }

            clearTimeout(window.nextStageBtnTimeout);
            $('.js-submit-shipping').removeAttr('disabled');
            $.spinner().stop();
        } else if (action === 'current') {
            // If the order total is 0, or this is an express payment, then skip
            // the billing step.
            if (grandTotalDecimal === 0 ||
                ((isReferenceTransaction || isExpress) && currentStage === 'shipping')
            ) {
                $('body').trigger('checkout:goToStage', { stage: 'placeOrder' });
                $('body').trigger('checkout:updateCheckoutView',
                    { order: data.order, customer: data.customer });
            } else {
                defer.resolve(data);
                $('body').trigger('checkout:updateCheckoutView', {
                    order: 'order' in data ? data.order : {},
                    customer: 'customer' in data ? data.customer : {}
                });
            }

            clearTimeout(window.nextStageBtnTimeout);
            $('.js-submit-shipping').removeAttr('disabled');
            $.spinner().stop();
        } else {
            resubmitSuggestedShippingAddress(defer);
        }
    };
}

/**
 * Registers an event handler method to the 'checkout:serializeShipping' jQuery
 * method on the body element. The method removes the UUID form field that is
 * appended if the SmartyStreets address validation is enabled.
 */
function handleCheckoutSerializeShipping() {
    $('body').on('checkout:serializeShipping', function (e, data) {
        appendSSShippingData();
        data.callback(data);
    });
}

/**
 * Handles the response for an new address request for SmartyStreets address
 * validation purposes.
 *
 * @param {Object} response - The response view data returned from the server.
 * @param {JQuery} $form - The jQuery form object.
 * @param {function} callback - The callback function that will be executed once
 *      the response has been completely handled. If there is a modal displayed,
 *      the callback will not be executed until after the modal is dismissed.
 */
function handleNewAddressAjaxResponse(response, $form, callback) {
    formHelpers.clearPreviousErrors($form);
    if (response.error) {
        if (response.fieldErrors.length) {
            formHelpers.loadFormErrors($form, response.fieldErrors);
        } else {
            $.each(response.serverErrors, function (i, element) {
                var errorHtml =
                    `
            <div class="alert c-alert alert-danger c-alert--danger alert-dismissible valid-cart-error fade show" role="alert">
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>'
                </button>
                ${element}
            </div>`;
                $('.shipping-error').append(errorHtml);
            });
        }
    } else {
        var vData = typeof response.addressVerification !== 'undefined' ?
            response.addressVerification : { enabled: false };
        var showModal = !vData.showModal ? false : vData.showModal;

        // Show the select-address modal
        if (vData.enabled && showModal) {
            var suggested = !vData.suggested ? [] : vData.suggested;
            var resources = !vData.resources ? {} : vData.resources;
            showSelectAddressModal(suggested, resources, $form, callback);

        // Allow the user to continue to Payment
        } else if (vData.enabled && vData.allowCurrent && !showModal) {
            callback('current');

        // Return the user to edit the address.
        } else {
            callback('edit');
        }
    }
}

/**
 * This method is called to handle the shipping form submissions response before
 * the rest of the JS gets executed.
 *
 * @param {JQueryDeferred} defer - The jQuery deferred object that can be
 *      resolved or rejected to proceed to the next step, or stop for an error.
 * @param {Object} data - The view data that was passed back to the browser from
 *      the call to submit the shipping form.
 * @return {Deferred} - Returns the defered chain of execution.
 */
function handleShippingFormResponse(defer, data) {
    var $plugin = $('#checkout-main');
    var isMultiShip = $plugin.hasClass('multi-ship');
    var isExpress = $plugin.data('checkoutExpressCheckout');
    var isReferenceTransaction = $plugin.data('checkoutReferenceTransaction');
    var isZeroTotal = data && data.order && data.order.totals &&
        typeof data.order.totals.grandTotalDecimal !== 'undefined' &&
        data.order.totals.grandTotalDecimal === 0;

    var formSelector = isMultiShip ?
        '.multi-shipping .active form' :
        '.single-shipping .shipping-form';
    var $form = $(formSelector);

    if (data.fieldErrors && data.fieldErrors.length) {
        // If this is multiship, then expand the form to show the errors.
        if (isMultiShip || $form.attr('data-address-mode') === 'edit') {
            $form.attr('data-address-mode', 'details');
            $form.find('.multi-ship-address-actions').removeClass('d-none');
            $form.find('.multi-ship-action-buttons .col-12.btn-save-multi-ship').addClass('d-none');
        }

        // Display any field errors for the user.
        data.fieldErrors.forEach(function (error) {
            if (Object.keys(error).length) {
                formHelpers.loadFormErrors($form, error);
            }
        });
        return defer.reject();
    } else if (typeof data.addressVerification !== 'undefined' &&
        data.addressVerification.enabled
    ) {
        // Verify the address with the SmartyStreets US Street address
        // verification service.
        var vData = data.addressVerification;
        var suggested = !vData.suggested ? [] : vData.suggested;
        var showModal = !vData.showModal ?
            false : vData.showModal;
        var resources = !vData.resources ? {} : vData.resources;
        var status = vData.serviceSuccess;

        if (showModal) {
            // If showModal is true then show the modal window.
            return showSelectAddressModal(
                suggested,
                resources,
                $form,
                getModalActionCallbackHandler(defer, data),
                status
            );
        }
    }

    // If the order total is 0, or this is a PayPal Express checkout, then
    // skip the billing section.
    if (isZeroTotal || isExpress || isReferenceTransaction) {
        $('body').trigger('checkout:goToStage', { stage: 'placeOrder' });
        $('body').trigger('checkout:updateCheckoutView',
            { order: data.order, customer: data.customer });
        return false;
    }

    // If showModal is false then continue.
    // If SmartyStreets is not enabled then continue.
    // Populate the Address Summary by resolving the deferred.
    $('body').trigger('checkout:updateCheckoutView', {
        order: data.order,
        customer: data.customer
    });

    return defer.resolve(data);
}

module.exports = {
    handleCheckoutSerializeShipping: handleCheckoutSerializeShipping,
    handleNewAddressAjaxResponse: handleNewAddressAjaxResponse,
    handleShippingFormResponse: handleShippingFormResponse
};
