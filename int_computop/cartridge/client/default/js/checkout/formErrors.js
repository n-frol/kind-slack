'use strict';

var baseFormErrors = require('base/checkout/formErrors');

/**
 * Clear the form errors.
 * @param {string} parentSelector - the parent form selector.
 */
baseFormErrors.clearPreviousErrors = function (parentSelector) {
    $(parentSelector).find('.form-control.is-invalid').removeClass('is-invalid');
    // remove invalid class from checkboxes
    $(parentSelector).find('.form-check-input.is-invalid').removeClass('is-invalid');
    $('.error-message').hide();
};

module.exports = baseFormErrors;
