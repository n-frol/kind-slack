'use strict';

/**
 * Provides custom helper functions to add onto base SFRA
 */


/**
 * returns a formed <option /> element
 * @param {Object} e - the event object
 * @param {Object} data - the object for the event
 * @returns {boolean} - Returns nothing of note
 */
function optionValueForAddress(e, data) {
    var safeOptions = data.options || {};
    var className = safeOptions.className || '';
    var uuidEl = $('input[value=' + data.productLineItem.UUID + ']');
    var form;
    var $shippingAddressSelector;
    if (typeof data.shipping === 'string') {
        return $('<option class="' + className + '" disabled>' + data.shipping +
            '</option>');
    }

    if (uuidEl && uuidEl.length > 0) {
        form = uuidEl[0].form;
        $shippingAddressSelector = $('.addressSelector', form);
    }

    var safeShipping = data.shipping || {};
    if ($shippingAddressSelector) {
        var optionEl = $shippingAddressSelector.find(`option[value=${safeShipping.UUID}]`);
        var giftObj = {
            'data-address-id': 'addressId',
            'data-company-name': 'companyName',
            'data-email': 'email',
            'data-gift-to': 'giftTo',
            'data-gift-from': 'giftFrom'
        };
        $.each(giftObj, function (key) {
            var mappedKey = giftObj[key];
            var mappedValue = safeShipping[mappedKey];
            optionEl.attr(key, mappedValue || '');
        });
    }

    return true;
}

module.exports = {
    init: function () {
        $('body').on('shipping:updateShippingAddressSelector', optionValueForAddress);
    }
};

