'use strict';

module.exports = {
    setDefaultPayment: function () {
        $('.js-make-payment-instrument-default').on('click', function (e) {
            e.preventDefault();
            var url = $(this).data('url') + '?UUID=' + $(this).data('uuid');

            $.ajax({
                url: url,
                type: 'get',
                dataType: 'json',
                success: function (data) {
                    window.location.reload();
                },
                error: function (err) {
                    if (err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                    $.spinner().stop();
                }
            });
        });
    }
};
