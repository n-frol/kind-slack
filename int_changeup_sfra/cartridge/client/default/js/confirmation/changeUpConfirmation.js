'use strict';

module.exports = function () {
    var timeoutFunc = null;
    var $cache = {};

    /**
     * Timer for launch
     * @param {Object} minutes Number of minutes for the timer.
     */
    function launchClock(minutes) {
        var end = minutes * 60 * 1000;
        timeoutFunc = setTimeout(() => {
            $cache.container.find('#header-wrapper, #merchant-statement-wrapper, #selection-wrapper, #send-it-content-wrapper').remove();
            $cache.container.find('#timer-end-content-wrapper').removeClass('hidden');
        }, end);
    }

    $cache.container = $('#changeup-charity-selection-wrapper');

    $cache.container.on('click', '.tile .tile-content, #search-box', function () {
        $cache.container.find('.tile').removeClass('selected');
        $(this).parent('.tile').addClass('selected');
    });

    $cache.container.on('click', '.charity-select', function () {
        if (!$(this).parent('.tile').hasClass('selected')) {
            return;
        }

        var uuid = $(this).data('uuid');
        var charityName = $(this).data('charityname');

        $.ajax({
            url: $cache.container.data('sendurl'),
            method: 'post',
            data: {
                uuid: uuid,
                orderno: $cache.container.data('orderno')
            }
        })
        .done((data) => {
            if (data && data.success) {
                // Custom success code
            } else {
                // Custom fail code
            }
        })
        .always(function () {
            $cache.container.find('#header-wrapper, #merchant-statement-wrapper, #selection-wrapper, #timer-end-content-wrapper').remove();
            $cache.container.find('#sendit-charity-name').text(charityName);
            $cache.container.find('#send-it-content-wrapper').removeClass('hidden');
            clearTimeout(timeoutFunc);
        });
    });

    launchClock(10);
};
