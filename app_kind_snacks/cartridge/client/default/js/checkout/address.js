'use strict';

// Right now this is just hear to make sure the filepaths for the files including address work correctly

var base = require('base/checkout/address');

/**
 * returns address properties from a UI form
 * @param {Form} form - the Form element
 * @returns {Object} - a JSON object with all values
 */
function getAddressFieldsFromUI(form) {
    var address = {
        firstName: $('input[name$=_firstName]', form).val(),
        lastName: $('input[name$=_lastName]', form).val(),
        address1: $('input[name$=_address1]', form).val(),
        address2: $('input[name$=_address2]', form).val(),
        city: $('input[name$=_city]', form).val(),
        postalCode: $('input[name$=_postalCode]', form).val(),
        stateCode: $('select[name$=_stateCode],input[name$=_stateCode]', form).val(),
        countryCode: $('select[name$=_country], input[name$=_country]', form).val(),
        phone: $('input[name$=_phone]', form).val()
    };
    return address;
}

base.methods.getAddressFieldsFromUI = getAddressFieldsFromUI;

module.exports = base;
