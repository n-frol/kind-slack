'use strict';

var base = require('base/paymentInstruments/paymentInstruments');
var cleave = require('../components/cleave');
var formValidation = require('../components/formValidation');

var paymentInstruments = Object.assign({}, base);
var url;

function confirmDelete(f) {
    f.preventDefault();
    $('.remove-payment').trigger('payment:remove', f);
    $.ajax({
        url: url,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            $('#uuid-' + data.UUID).remove();
            if (data.message) {
                var toInsert = '<div><h3>' +
                data.message +
                '</h3><div>';
                $('.paymentInstruments').after(toInsert);
            }
        },
        error: function (err) {
            if (err.responseJSON.redirectUrl) {
                window.location.href = err.responseJSON.redirectUrl;
            }
            $.spinner().stop();
        }
    });
}

paymentInstruments.submitPayment = function () {
    $('form.payment-form').submit(function (e) {
        var $form = $(this);
        e.preventDefault();
        url = $form.attr('action');
        $form.spinner().start();
        $('form.payment-form').trigger('payment:submit', e);

        var formData = cleave.serializeData($form);
        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: formData,
            success: function (data) {
                $form.spinner().stop();
                if (!data.success) {
                    if (!data.recpatcha) {
                        $(".recaptcha_error").html($(".recaptcha3_error").attr("data-recaptcha-error")).show();
                    }
                    formValidation($form, data);
                    $('html, body').animate({
                        scrollTop: ($form.offset().top - 150) > 0 ?
                        ($form.offset().top - 150) : 0
                    }, 400);
                } else {
                    location.href = data.redirectUrl;
                }
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
                $form.spinner().stop();
            }
        });
        return false;
    });
};

paymentInstruments.handleCreditCardNumber = function () {
    if ($('#cardNumber').length && $('#cardType').length) {
        cleave.handleCreditCardNumber('#cardNumber', '#cardType');
    }
};

paymentInstruments.removePayment = function () {
    $('.remove-payment').on('click', function (e) {
        e.preventDefault();
        $('.delete-confirmation-btn').off('click', confirmDelete);

        url = $(this).data('url') + '?UUID=' + $(this).data('id');
        $('.payment-to-remove').empty().append($(this).data('card'));

        $('.delete-confirmation-btn').on('click', confirmDelete);
    });
};

module.exports = paymentInstruments;
