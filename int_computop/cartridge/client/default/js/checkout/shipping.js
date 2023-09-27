'use strict';

var base = require('base/checkout/shipping');

/**
 * updates the shipping address form values within shipping forms
 * @param {Object} shipping - the shipping (shipment model) model
 */
function updateShippingAddressFormValues(shipping) {
    var addressObject = $.extend({}, shipping.shippingAddress);

    if (!addressObject) {
        addressObject = {
            firstName: null,
            lastName: null,
            address1: null,
            address2: null,
            houseNumber: null,
            city: null,
            postalCode: null,
            stateCode: null,
            countryCode: null,
            phone: null
        };
    }

    addressObject.isGift = shipping.isGift;
    addressObject.giftMessage = shipping.giftMessage;

    $('input[value=' + shipping.UUID + ']').each(function (formIndex, el) {
        var form = el.form;
        if (!form) return;
        var countryCode = shipping.shippingAddress.countryCode;

        $('input[name$=_firstName]', form).val(shipping.shippingAddress.firstName);
        $('input[name$=_lastName]', form).val(shipping.shippingAddress.lastName);
        $('input[name$=_address1]', form).val(shipping.shippingAddress.address1);
        $('input[name$=_address2]', form).val(shipping.shippingAddress.address2);
        // dotsource custom
        $('input[name$=_houseNumber]', form).val(addressObject.houseNumber);
        $('input[name$=_city]', form).val(shipping.shippingAddress.city);
        $('input[name$=_postalCode]', form).val(shipping.shippingAddress.postalCode);
        $('select[name$=_stateCode],input[name$=_stateCode]', form)
            .val(addressObject.stateCode);

        if (countryCode && typeof countryCode === 'object') {
            $('select[name$=_country]', form).val(addressObject.countryCode.value);
        } else {
            $('select[name$=_country]', form).val(addressObject.countryCode);
        }

        $('input[name$=_phone]', form).val(addressObject.phone);
        $('input[name$=_isGift]', form).prop('checked', addressObject.isGift);
        $('textarea[name$=_giftMessage]', form).val(addressObject.isGift && addressObject.giftMessage ? addressObject.giftMessage : '');
    });
    $('body').trigger('shipping:updateShippingAddressFormValues', { shipping: shipping });
}

base.methods.updateShippingAddressFormValues = updateShippingAddressFormValues;
module.exports = base;
