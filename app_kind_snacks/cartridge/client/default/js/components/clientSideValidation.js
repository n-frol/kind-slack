'use strict';

var base = require('base/components/clientSideValidation');

/**
 *
 * @param {string} resp - The reCaptcha response data that will be passed to the form
 */
function reCaptchaValidated(resp) {
    if (resp) {
        $('#g-recaptcha-response').removeClass('is-invalid');
    }
}

// Need to export to window so as to be accessible to the callback
window.reCaptchaValidated = reCaptchaValidated;

/**
 * Validate whole form. Requires `this` to be set to form object
 * @param {jQuery.event} event - Event to be canceled if form is invalid.
 * @returns {boolean} - Flag to indicate if form is valid
 */
function validateForm(event) {
    var valid = true;
    if (this.checkValidity && !this.checkValidity()) {
        // safari
        valid = false;
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }
        $(this).find('input, select').each(function () {
            if (!this.validity.valid) {
                $(this).trigger('invalid', this.validity);
            }
        });
    }

    // Add client-side validation to the recaptcha form
    const $reCaptcha = $(this).find('#g-recaptcha-response');
    if ($reCaptcha.length && !$reCaptcha.val()) {
        valid = false;
        $reCaptcha.parent().height(''); // Set to auto height so it doesn't hide the invalid-feedback message
        $reCaptcha.addClass('is-invalid').addClass('form-control');

        // Add messaging so the user knows they missed the reCaptcha, if not already added
        const $reCaptchaFeedback = $reCaptcha.nextAll('js-invalid-feedback');
        if (!$reCaptchaFeedback.length) {
            $reCaptcha.after(`<span class="js-invalid-feedback invalid-feedback">${$(this).find('.g-recaptcha').data('error')}</span>`);
        }
    }

    return valid;
}

module.exports = {
    // Add form textareas to invalid functionality
    invalid: function () {
        base.invalid();
        $('form textarea').on('invalid', function (e) {
            e.preventDefault();
            this.setCustomValidity('');
            if (!this.validity.valid) {
                var validationMessage = this.validationMessage;
                $(this).addClass('is-invalid');
                if (this.validity.patternMismatch && $(this).data('pattern-mismatch')) {
                    validationMessage = $(this).data('pattern-mismatch');
                }
                if ((this.validity.rangeOverflow || this.validity.rangeUnderflow)
                    && $(this).data('range-error')) {
                    validationMessage = $(this).data('range-error');
                }
                if ((this.validity.tooLong || this.validity.tooShort)
                    && $(this).data('range-error')) {
                    validationMessage = $(this).data('range-error');
                }
                if (this.validity.valueMissing && $(this).data('missing-error')) {
                    validationMessage = $(this).data('missing-error');
                }
                $(this).parents('.form-group').find('.invalid-feedback')
                    .text(validationMessage);
            }
        });
    },
    submit: function () {
        base = this;
        $('form').on('submit', function (e) {
            if (base && base.methods && base.methods.validateForm) {
                return base.methods.validateForm.call(this, e);
            }

            return validateForm.call(this, e);
        });
    },
    methods: {
        validateForm: validateForm
    },
    functions: {
        validateForm: function (form, event) {
            validateForm.call($(form), event || null);
        },
        clearForm: base.functions.clearForm
    }
};
