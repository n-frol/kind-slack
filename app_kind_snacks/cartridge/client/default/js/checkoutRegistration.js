'use strict';

var formValidation = require('base/components/formValidation');

/**
 * Pre-populates loginradius form with information from the checkout form
 */
function prepopulateCheckoutRegistration() {
    var $registration = $('.js-confirmation-registration');

    if ($registration.length) {
        if (!$registration.find('form[name="loginradius-registration"]').length) {
            setTimeout(prepopulateCheckoutRegistration, 250);
            return;
        }

        if ($registration.data('fname')) {
            $('#loginradius-registration-firstname').val($registration.data('fname'));
        }
        if ($registration.data('lname')) {
            $('#loginradius-registration-lastname').val($registration.data('lname'));
        }
        if ($registration.data('email')) {
            $('#loginradius-registration-emailid').val($registration.data('email'));
        }

        return;
    }
}

$(document).ready(function () {
    prepopulateCheckoutRegistration();

    $('form.checkout-registration').submit(function (e) {
        var form = $(this);
        e.preventDefault();
        var url = form.attr('action');
        form.spinner().start();
        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: form.serialize(),
            success: function (data) {
                form.spinner().stop();
                if (!data.success) {
                    formValidation(form, data);
                } else {
                    location.href = data.redirectUrl;
                }
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
                form.spinner().stop();
            }
        });
        return false;
    });
});
