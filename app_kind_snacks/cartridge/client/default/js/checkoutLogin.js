/* global dataLayer, dataLayerCheckout */
'use strict';

var formValidation = require('base/components/formValidation');
var LoginRadius = require('int_loginradius/loginRadius/loginRadius');

$(document).ready(function () {
    var stepNumber = '1';
    if (typeof dataLayerCheckout !== 'undefined') {
        dataLayerCheckout.step = stepNumber;
        dataLayerCheckout.ecommerce.checkout.actionField.step = stepNumber;
        dataLayer.push(dataLayerCheckout);
    }

    $('form.login').submit(function (e) {
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
                form.spinner().stop();
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
            }
        });
        return false;
    });

    var loginRadius = new LoginRadius();

    // Init forms that should be created on page load.
    const $elements = $('.js-loginradius-onload');
    loginRadius.loadForms($elements);

    // Add the LoginRadius click handler to the forgot-password button.
    var $forgotBtn = $('.js-forgot-password-btn');
    if ($forgotBtn.length) {
        $forgotBtn.on('click.lr', function (event) {
            var $this = $(this);

            // Load the form for the forgot-password UI.
            loginRadius.loadForms([$this]);
        });
    }
});
