'use strict';
var formHelpers = require('../checkout/formErrors');

/**
 * Handles custom functionality for the MarketingCloud subscription
 */

module.exports = {
    init() {
        $('.js-subscription-submit').on('click', function (e) {
            var $form = $(this).closest('.js-subscribe');
            if (!$form.hasClass('js-subscribe--ajax')) {
                e.preventDefault();
                var formData = $form.serialize();
                var url = $form.find('.js-subscribe-url').val();

                if (url) {
                    $.ajax({
                        url: url,
                        method: 'POST',
                        data: formData,
                        success: function (data) {
                            window.form = $form;
                            if (data.error) {
                                data.fieldErrors.forEach(function (error) {
                                    formHelpers.loadFormErrors('.js-subscribe', error);
                                });

                                return;
                            }

                            $('.js-subscribe').trigger('submit');
                        }
                    });
                }
            }
        });

        $('.js-subscribe--ajax').on('submit', function (e) {
            e.preventDefault();
            var $form = $(this);
            var $btn = $form.find('.js-subscription-submit');
            var formData = $form.serialize();
            var url = $form.attr('action');

            if (url) {
                $.ajax({
                    url: url,
                    method: 'POST',
                    data: formData,
                    success: function (data) {
                        $btn.prop('disabled', !data.error)
                            .toggleClass('is-success', !data.error);
                        $form.find('.js-subscribe-email').toggleClass('is-invalid', !!data.error);
                        $('.js-subscribe-email-feedback').html(data.statusMessage || '')
                            .toggleClass('error', !!data.error);
                    }
                });
            }
        });

        $('body').on('click', '.js-subscribe-email-feedback.error', function () {
            $(this).html(''); // Hide/clear
        });
    }
};
