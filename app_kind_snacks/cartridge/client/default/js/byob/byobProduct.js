'use strict';

module.exports = {
    onInitializeAlert: function () {
        var $modalContainer = $('.js-byob-alert-pdp');

        /**
         * Click handler to perform list clear/resize and forward to category page.
         */
        $modalContainer.on('click.byob', '.js-byob-confirm-empty', function (e) {
            $modalContainer.modal('hide');

            var submitBoxUrl = $('.js-byob-get-started-url').attr('data-url');
            var pid = $(this).attr('data-pid');

            if ((typeof pid === 'undefined') || (typeof submitBoxUrl === 'undefined')) {
                return;
            }

            // Start the progress indicator
            $('body').spinner().start();

            $.ajax({
                url: submitBoxUrl,
                method: 'POST',
                data: {
                    pid: pid
                }
            })
            .done(function (respData, status, xhr) {
                if (typeof respData.forwardUrl !== 'undefined') {
                    window.location.href = respData.forwardUrl;
                }

                $('body').spinner().stop();
            })
            .fail(function (err) {
                $('body').spinner().stop();
            });
        });
        /**
         * Click handler method to cancel clearing list.
         */
        $modalContainer.on('click.byob', '.js-byob-close-alert', function (e) {
            $modalContainer.modal('hide');
        });
    }
};
