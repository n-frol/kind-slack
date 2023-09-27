'use strict';

var base = require('app_storefront_base/checkout/summary');

/**
 * updates the order product shipping summary for an order model
 * @param {Object} order - the order model
 */
function updateOrderProductSummaryInformation(order) {
    var $productSummary = $('<div />');
    order.shipping.forEach(function (shipping) {
        var pliCount = 0;
        shipping.productLineItems.items.forEach(function (lineItem) {
            // Don't try and append box contents
            if (!lineItem.boxId || lineItem.isByobMaster) {
                pliCount++;
                var pli = $('.product-summary-block [data-product-line-item=' + lineItem.UUID + ']');
                var shippingBlock = $(`<div class="shipment-block c-sidebar-product-summary__shipment-block"></div>`);
                if (pliCount === 1) {
                    shippingBlock.append('<h2 class="multi-shipping h4 mb-0"></h2>');
                }
                $productSummary.append(shippingBlock);
                shippingBlock.append(pli);
            }
        });

        var address = shipping.shippingAddress || {};
        var selectedMethod = shipping.selectedShippingMethod;

        var nameLine = address.firstName ? address.firstName + ' ' : '';
        if (address.lastName) nameLine += address.lastName;

        var address1Line = address.address1;
        var address2Line = address.address2;

        var email = address.email;
        var companyName = address.companyName;
        var phoneLine = address.phone;

        var shippingCost = selectedMethod ? selectedMethod.shippingCost : '';
        var methodNameLine = selectedMethod ? selectedMethod.displayName : '';
        var methodArrivalTime = selectedMethod && selectedMethod.estimatedArrivalTime
            ? '( ' + selectedMethod.estimatedArrivalTime + ' )'
            : '';

        var tmpl = $('#pli-shipping-summary-template').clone();

        if (shipping.productLineItems.items && shipping.productLineItems.items.length > 1) {
            $('h5 > span').text(' - ' + shipping.productLineItems.items.length + ' '
                + order.resources.items);
        } else {
            $('h5 > span').text('');
        }

        var stateRequiredAttr = $('#shippingState').attr('required');
        var isRequired = stateRequiredAttr !== undefined && stateRequiredAttr !== false;
        var stateExists = (shipping.shippingAddress && shipping.shippingAddress.stateCode)
            ? shipping.shippingAddress.stateCode
            : false;
        var stateBoolean = false;
        if ((isRequired && stateExists) || (!isRequired)) {
            stateBoolean = true;
        }

        var shippingForm = $('.multi-shipping input[name="shipmentUUID"][value="' + shipping.UUID + '"]').parent();

        if (shipping.shippingAddress
            && shipping.shippingAddress.firstName
            && shipping.shippingAddress.address1
            && shipping.shippingAddress.city
            && stateBoolean
            && shipping.shippingAddress.countryCode
            && (shipping.shippingAddress.phone || shipping.productLineItems.items[0].fromStoreId)) {
            $('.ship-to-name', tmpl).text(nameLine);
            $('.ship-to-address1', tmpl).text(address1Line);
            $('.ship-to-address2', tmpl).text(address2Line);
            $('.ship-to-city', tmpl).text(address.city);
            if (address.stateCode) {
                $('.ship-to-st', tmpl).text(address.stateCode);
            }
            $('.ship-to-zip', tmpl).text(address.postalCode);
            $('.ship-to-email', tmpl).text(email);
            $('.ship-to-companyName', tmpl).text(companyName);
            $('.ship-to-phone', tmpl).text(phoneLine);

            if (!address2Line) {
                $('.ship-to-address2', tmpl).hide();
            }
            if (!email) {
                $('.ship-to-email', tmpl).hide();
            }
            if (!companyName) {
                $('.ship-to-companyName', tmpl).hide();
            }
            if (!phoneLine) {
                $('.ship-to-phone', tmpl).hide();
            }

            shippingForm.find('.ship-to-message').text('');
        } else {
            shippingForm.find('.ship-to-message').text(order.resources.addressIncomplete);
        }
        if (shipping.giftTo || shipping.giftFrom || shipping.giftMessage) {
            var $label = $('.js-gift-summary-label', tmpl);
            $label.removeClass('d-none');
            if (shipping.giftTo) {
                $label.append($('.js-gift-to', $label).html() + ': ' + shipping.giftTo + ' ').removeClass('d-none');
            }
            if (shipping.giftFrom) {
                $label.append($('.js-gift-from', $label).html() + ': ' + shipping.giftFrom).removeClass('d-none');
            }
            $('.gift-message-summary', tmpl).text(shipping.giftMessage);
        } else {
            $('.gift-summary', tmpl).addClass('d-none');
            $('.js-gift-summary', tmpl).addClass('d-none');
        }

        // checking h5 title shipping to or pickup
        var $shippingAddressLabel = $('.shipping-header-text', tmpl);
        $('body').trigger('shipping:updateAddressLabelText',
            { selectedShippingMethod: selectedMethod, resources: order.resources, shippingAddressLabel: $shippingAddressLabel });

        if (shipping.selectedShippingMethod) {
            $('.display-name', tmpl).text(methodNameLine);
            $('.arrival-time', tmpl).text(methodArrivalTime);
            $('.price', tmpl).text(shippingCost);
        }

        var $shippingSummary = $('<div class="c-checkout-product-summary" data-shipment-summary="'
            + shipping.UUID + '" />');
        $shippingSummary.html(tmpl.html());
        $productSummary.append($shippingSummary);
    });

    $('.product-summary-block').html($productSummary.html());
}

var summary = Object.assign({}, base);
summary.updateOrderProductSummaryInformation = updateOrderProductSummaryInformation;

module.exports = summary;
