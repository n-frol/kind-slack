'use strict';

/**
 * Add-on to/customize Bootstrap's tab functionality
 */

module.exports = {
    init() {
        $('.js-custom-tab-label').on('shown.bs.tab', function (e) {
            $(this).closest('.js-custom-tab-item').addClass('c-tabs__item--active');
        });
        $('.js-custom-tab-label').on('hidden.bs.tab', function (e) {
            $(this).closest('.js-custom-tab-item').removeClass('c-tabs__item--active');
        });
    }
};

