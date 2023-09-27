'use strict';

/**
 * Display error messages and highlight form fields with errors.
 * @param {string|JQuery} parent - the form which contains the fields
 * @param {Object} fieldErrors - the fields with errors
 */
function loadFormErrors(parent, fieldErrors) { // eslint-disable-line
    var $el = [];
    var errorFields = Object.keys(fieldErrors);

    // Set default to be below the header.
    var scrollTop = 150;

    // Display error messages and highlight form fields with errors.
    $.each(errorFields, function (i, fieldName) {
        var fieldError = fieldErrors[fieldName];

        if (typeof parent === 'string') {
            if (parent.indexOf('.') === 0 || parent.indexOf('#') === 0) {
                // Class name or ID as JQuery selector passed as parent.
                $el = $(parent).find('*[name=' + fieldName + ']');
            } else {
                // Form name passed as parent
                $el = $('form[name=' + parent + ']')
                    .find('*[name=' + fieldName + ']');
            }
        } else {
            $el = parent.find('*[name=' + fieldName + ']');
        }

        $el.addClass('is-invalid')
            .siblings('.invalid-feedback')
            .html(fieldError);

        // Only set the scroll for the first error found.
        if (scrollTop === 150 && $el.length && $el.offset()) {
            scrollTop = ($el.offset().top - 150) > 0 ?
                ($el.offset().top - 150) : 0;
        }
    });

    // Scroll to the last error.
    $('html, body').animate({
        scrollTop: scrollTop
    }, 400);
}

/**
 * Clear the form errors.
 * @param {string|JQuery} parent - the parent form selector OR a JQuery
 *      Element reference to the parent element.
 */
function clearPreviousErrors(parent) {
    var $form = typeof parent === 'string' ?
        $(parent) : parent;

    $form.find('.form-control.is-invalid').removeClass('is-invalid');
    $('.error-message').hide();
}

module.exports = {
    loadFormErrors: loadFormErrors,
    clearPreviousErrors: clearPreviousErrors
};
