/* eslint-disable spaced-comment */
'use strict';

var addressHelpers = require('./address');
var formHelpers = require('./formErrors');
var smartyHelpers = require('./smartyStreets');
var base = require('base/checkout/shipping');
var debounce = require('lodash/debounce');

var DEBOUNCE_INTERVAL = 1000;

var debouncedUpdateShippingMethodList = debounce(base.methods.updateShippingMethodList, DEBOUNCE_INTERVAL);

$(".submit-shipping").on('click', function () {
    $(".btn-show-details").click();
});

/*
* ?addressId=[id] is required for updating existing addresses. This may
* remain blank if we're adding a new address
*/
function getSaveAddress(addressId, $form) {
    var saveAddressUrl = $form.find('input[name="saveAddress"]').attr('data-save-address-url');
    var addressIdPosition = saveAddressUrl.indexOf('?addressId');

    if (addressIdPosition === -1) {
        return saveAddressUrl + '?addressId=' + addressId;
    }
    var addressIdValue = saveAddressUrl.substring(addressIdPosition, saveAddressUrl.length);
    return saveAddressUrl.replace(addressIdValue, '?addressId=' + addressId);
}


/*
* Returns the current data-save-address addressId value
*
*/
function getSaveAddressId($form) {
    var saveAddressUrl = $form.find('input[name="saveAddress"]').attr('data-save-address-url');
    var addressIdPosition = saveAddressUrl.indexOf('?addressId');

    if (addressIdPosition !== -1) {
        return saveAddressUrl.substring(addressIdPosition + 11, saveAddressUrl.length);
    }
    return '';
}

/**
 * Handle response from the server for valid or invalid form fields.
 *
 * @override
 * @param {Object} defer - the deferred object which will resolve on success or reject.
 * @param {Object} data - the response data with the invalid form fields or
 *  valid model data.
 */
function shippingFormResponse(defer, data) {
    // eslint-disable-next-line
    if (smartyHelpers.handleShippingFormResponse(defer, data)) {

        var isMultiShip = $('#checkout-main').hasClass('multi-ship');
        var formSelector = isMultiShip ?
            '.multi-shipping .active form' :
            '.single-shipping form';

        // highlight fields with errors
        if (data.error) {
            if (data.fieldErrors.length) {
                data.fieldErrors.forEach(function (error) {
                    if (Object.keys(error).length) {
                        formHelpers.loadFormErrors(formSelector, error);
                    }
                });
                defer.reject(data);
            }

            if (data.serverErrors && data.serverErrors.length) {
                /**
                 * @override: Remove existing error msg before appending more.
                 */
                // Check if there are existing errors displayed and remove them.
                var $errorContainer = $('.shipping-error');
                var $errors = $errorContainer.find('.alert-danger');
                if ($errors.length) {
                    $errors.remove();
                }

                /** @override: Added the index argument to the $.each callback */
                // Loop through the returned errors and add them to the container.
                $.each(data.serverErrors, function (i, element) {
                    /**
                     * @override: Changed from concat. string to a template literal.
                     */
                    var errorHtml =
                        `
                    <div class="alert c-alert alert-danger c-alert--danger alert-dismissible valid-cart-error fade show" role="alert">
                        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        ${element}
                    </div>`;
                    $errorContainer.append(errorHtml);
                });

                /** @override: Added scroll to error */
                // Scroll to the error.
                $('html, body').animate({
                    scrollTop: $errorContainer.offset().top
                }, 400);

                defer.reject(data);
            }

            if (data.cartError) {
                window.location.href = data.redirectUrl;
                defer.reject();
            }
        } else {
            // Populate the Address Summary
            $('body').trigger('checkout:updateCheckoutView', {
                order: data.order,
                customer: data.customer
            });
            defer.resolve(data);
        }
    }
}

/**
 * Hide and show to appropriate elements to show the multi ship shipment cards in the view mode
 * @param {jQuery} element - The shipping content
 */
function viewMultishipAddress(element) {
    element.find('.view-address-block').removeClass('d-none');
    element.find('.btn-edit-multi-ship').removeClass('d-none');
    element.find('.multi-ship-address-actions').removeClass('d-none');
    element.find('.shipping-address').addClass('d-none');
    element.find('.btn-save-multi-ship.save-shipment').addClass('d-none');
    element.find('.btn-enter-multi-ship').addClass('d-none');
    element.find('.multi-ship-address-actions').addClass('d-none');
}

/**
 * Hide and show to appropriate elements that allows the user to edit multi ship address information
 * @param {jQuery} element - The shipping content
 */
function editMultiShipAddress(element) {
    // Show
    element.find('.shipping-address').removeClass('d-none');
    element.find('.btn-save-multi-ship.save-shipment').removeClass('d-none');

    // Hide
    element.find('.view-address-block').addClass('d-none');
    element.find('.btn-enter-multi-ship').addClass('d-none');
    element.find('.btn-edit-multi-ship').addClass('d-none');
    element.find('.multi-ship-address-actions').addClass('d-none');

    $('body').trigger('shipping:editMultiShipAddress', {
        element: element,
        form: element.find('.shipping-form')
    });
}

/**
 * Submits a form to the CheckoutAddressServices-AddNewAddress endpoint for
 * saving to the shipment.
 *
 * @param {JQuery} $element - The JQuery element that is responsible for
 *      triggering the form submission.
 * @param {JQuery} $form - The JQuery Element for the HTML form that should be
 *      submitted.
 * @returns {boolean} - Returns false to stop propogation.
 */
function addNewAddressAjax($element, $form) {
    var $this = $element;
    var $rootEl = $this.closest('.shipping-content');
    var data = $form.serialize();
    var url = $form.attr('action');

    $rootEl.spinner().start();
    $.ajax({
        url: url,
        type: 'post',
        dataType: 'json',
        data: data
    })
    .done(function (response) {
        formHelpers.clearPreviousErrors($form);
        if (response.error) {
            // If there were field errors, then invalidate the form fields.
            if (response.fieldErrors.length) {
                response.fieldErrors.forEach(function (error) {
                    formHelpers.loadFormErrors($form, response.fieldErrors);
                });
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
            /**
             * Callback function to update the UI if the address is valid or
             * allowable and selected by the user.
             *
             * @param {Object} resp - A reference to the JSON response object
             *      returned from the server.
             * @param {JQuery} $rootEle - A JQuery Element instance of the
             *      submitted form.
             */
            var updateUIWithResponse = function (resp, $rootEle) {
                $('body').trigger('checkout:updateCheckoutView', {
                    order: resp.order,
                    customer: resp.customer
                });

                viewMultishipAddress($rootEle);
            };

            /**
            * @callback - Defines callback options for handling what
            *      happens when the user selects an address option from
            *      one of the modal buttons.
            * @param {string} action - What action to perform when the
            *      modal window is closed. Options for action:
            * - edit: Keep the user on the current shipping address
            *      form so they can correct the address.
            * - current: Allow the current address. call the callback
            *      function to update the UI with the returned address.
            * - suggestion: Submit address to the AddAddress endpoint.
            */
            var cb = function (action) {
                if (action === 'edit') {
                    editMultiShipAddress($rootEl);
                } else if (action === 'suggestion') {
                    addNewAddressAjax($this, $form);
                } else {
                    updateUIWithResponse(response, $rootEl);
                }
            };

            smartyHelpers.handleNewAddressAjaxResponse(response, $form, cb);
        }

        if (response.order && response.order.shippable) {
            $('button.submit-shipping').attr('disabled', null);
        }

        $rootEl.spinner().stop();
    })
    .fail(function (err) {
        if (err.responseJSON && err.responseJSON.redirectUrl) {
            window.location.href = err.responseJSON.redirectUrl;
        }

        $rootEl.spinner().stop();
    });

    return false;
}

var shipping = Object.assign({}, base);

shipping.methods.shippingFormResponse = shippingFormResponse;
shipping.methods.getSaveAddress = getSaveAddress;
shipping.methods.getSaveAddressId = getSaveAddressId;
shipping.methods.debouncedUpdateShippingMethodList = debouncedUpdateShippingMethodList;

/**
 * Base SFRA function
 * Added in handling for email, giftTo, and giftFrom fields
 */
shipping.selectShippingMethod = function () {
    $('.shipping-method-list').change(function () {
        var $shippingForm = $(this).parents('form');
        var methodID = $(':checked', this).val();
        var shipmentUUID = $shippingForm.find('[name=shipmentUUID]')
            .val();
        var urlParams = addressHelpers.methods.getAddressFieldsFromUI(
            $shippingForm);
        urlParams.shipmentUUID = shipmentUUID;
        urlParams.methodID = methodID;
        urlParams.email = $shippingForm.find('input[name$=_email]')
            .val();
        urlParams.companyName = $shippingForm.find('input[name$=_companyName]')
            .val();
        urlParams.giftMessage = $shippingForm.find(
            'textarea[name$=_giftMessage]').val();
        urlParams.giftTo = $shippingForm.find(
            'input[name$=_giftTo]').val();
        urlParams.giftFrom = $shippingForm.find(
            'input[name$=_giftFrom]').val();
        urlParams.isGift = $shippingForm.find('.gift').prop('checked');
        var url = $(this).data('select-shipping-method-url');
        base.methods.selectShippingMethodAjax(url, urlParams, $(
            this));
    });
};
shipping.saveMultiShipInfo = function () {
    $('.btn-save-multi-ship').on('click', function (e) {
        e.preventDefault();

        // Save address to checkoutAddressBook
        var $this = $(this);
        var $form = $this.closest('form');

        addNewAddressAjax($this, $form);
    });
};

shipping.selectSingleShipAddress = function () {
    $('.single-shipping .addressSelector').on('change', function () {
        var $form = $(this).parents('form');
        var form = $form[0];
        var selectedOption = $('option:selected', this);
        var attrs = selectedOption.data();
        var shipmentUUID = selectedOption[0].value;
        var originalUUID = $('input[name=shipmentUUID]', form).val();
        var element;

        Object.keys(attrs).forEach(function (attr) {
            if (attr === 'addressId') {
                var saveAddressUrl = getSaveAddress(attrs[attr], $form);
                $('[name=saveAddress]', form).data('save-address-url', saveAddressUrl).attr('data-save-address-url', saveAddressUrl);
            } else {
                element = attr === 'countryCode' ? 'country' : attr;
                const $elem = $('[name$=' + element + ']', form);

                if (attr.indexOf('gift') !== -1) {
                    $elem.val(attrs[attr] || $elem.val()); // Don't blank out gift fields
                } else {
                    $elem.val(attrs[attr]);
                }
            }
        });

        $('[name$=stateCode]', form).trigger('change');

        if (shipmentUUID === 'new') {
            $(form).attr('data-address-mode', 'new');
        } else if (shipmentUUID === originalUUID) {
            $(form).attr('data-address-mode', 'shipment');
        } else if (shipmentUUID.indexOf('ab_') === 0) {
            $(form).attr('data-address-mode', 'customer');
        } else {
            $(form).attr('data-address-mode', 'edit');
        }
    });
};

/**
 * Override base version of updateShippingList with debounced version
 */
shipping.updateShippingList = function () {
    var baseObj = this;
    $('select[name$="shippingAddress_addressFields_states_stateCode"]')
        .on('change', function (e) {
            if (baseObj.methods && baseObj.methods.debouncedUpdateShippingMethodList) {
                baseObj.methods.debouncedUpdateShippingMethodList($(e.currentTarget.form));
            } else {
                debouncedUpdateShippingMethodList($(e.currentTarget.form));
            }
        });
    $('select[name$="shippingAddress_addressFields_states_stateCode"]')
        .on('blur', function (e) {
            if (baseObj.methods && baseObj.methods.debouncedUpdateShippingMethodList) {
                baseObj.methods.debouncedUpdateShippingMethodList.flush();
            } else {
                debouncedUpdateShippingMethodList.flush();
            }
        });
};


/**
 * Does Ajax call to create a server-side shipment w/ pliUUID & URL
 * @param {string} url - string representation of endpoint URL
 * @param {Object} shipmentData - product line item UUID
 * @returns {Object} - promise value for async call
 */
// eslint-disable-next-line no-unused-vars
function saveSplitShipment(url, shipmentData) {
    $.spinner().start();
    return $.ajax({
        url: url,
        type: 'post',
        dataType: 'json',
        data: shipmentData
    });
}

shipping.selectMultiShipAddress = function () {
    $('.multi-shipping .addressSelector').on('change', function () {
        var form = $(this).closest('form');
        var selectedOption = $('option:selected', this);
        var attrs = selectedOption.data();
        var shipmentUUID = selectedOption[0].value;
        var originalUUID = $('input[name=shipmentUUID]', form).val();
        var pliUUID = $('input[name=productLineItemUUID]', form).val();
        Object.keys(attrs).forEach(function (attr) {
            var val = attrs[attr];
            var $el = $('[name$=' + attr + ']', form);
            if (attr === 'isGift') {
                $el.prop('checked', val);
            } else {
                $el.val(val);
            }
        });

        var addNewAddressUrl = $(this).attr('data-add-new-address-url');
        if (shipmentUUID === 'new' && pliUUID) {
            $(form).attr('data-address-mode', 'new');
        } else if (shipmentUUID === originalUUID) {
            $('select[name$=stateCode]', form).trigger('change');
            $(form).attr('data-address-mode', 'shipment');
        } else if (shipmentUUID.indexOf('ab_') === 0) {
            var serializedData = $(form).serialize();
            saveSplitShipment(addNewAddressUrl, serializedData)
                .done(function (response) {
                    $.spinner().stop();
                    if (response.error) {
                        if (response.redirectUrl) {
                            window.location.href = response.redirectUrl;
                        }
                        return;
                    }

                    $('body').trigger('checkout:updateCheckoutView',
                        {
                            order: response.order,
                            customer: response.customer,
                            options: { keepOpen: true }
                        }
                    );

                    $(form).attr('data-address-mode', 'customer');
                    // eslint-disable-next-line no-unused-vars
                    var $rootEl = $(form).closest('.shipping-content');
                    //editMultiShipAddress($rootEl);
                })
                .fail(function () {
                    $.spinner().stop();
                });
        } else {
            var updatePLIShipmentUrl = $(form).attr('action');
            var serializedAddress = $(form).serialize();
            saveSplitShipment(updatePLIShipmentUrl, serializedAddress)
                .done(function (response) {
                    $.spinner().stop();
                    if (response.error) {
                        if (response.redirectUrl) {
                            window.location.href = response.redirectUrl;
                        }
                        return;
                    }

                    $('body').trigger('checkout:updateCheckoutView',
                        {
                            order: response.order,
                            customer: response.customer,
                            options: { keepOpen: true }
                        }
                    );

                    $(form).attr('data-address-mode', 'edit');
                })
                .fail(function () {
                    $.spinner().stop();
                });
        }
    });
};


shipping.saveGiftMessage = function () {
    $(".gift-message").focusout(function (e) {
        if ($(this).has(document.activeElement).length === 0) {
            var toAndFrom = $(this).find('input:visible').filter(function () {
                return !this.value;
            });
            if (toAndFrom.length > 0) {
                $(this).find('.gift').prop('checked', false);
            } else {
                $(this).find('.gift').prop('checked', true);
            }
            var $target = $(this).closest('.shipping-address').find('.shipping-method-list');
            $target.trigger('change');
        }
    });
};

module.exports = shipping;
