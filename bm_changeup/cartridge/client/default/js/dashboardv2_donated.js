'use strict';
window.jQuery = require('jquery');
jQuery.noConflict();
jQuery(document).ready(function ($) {

var check_donated_date = setInterval(function () {
    if ($('#donated_checkout_date').length) {
        if ($('#cfg_total_donations_toggle').val() == 'true') {
            $('.donated-container').show();

        } else {
            $('.donated-container').hide();
        }
        $('#donated_checkout_date').on('click', function () {
            if ($(this).prop('checked')) {
                $('.donated-container').hide("slow");
            } else {
                $('.donated-container').show("slow");
            }
        });
        clearInterval(check_donated_date);
    }
}, 100);
});
