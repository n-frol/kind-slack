'use strict';

/**
 * Functionality for custom locale switcher elements
 */

module.exports = {
    init() {
        $('body')
            .on('change', '.js-locale-switcher', function () {
                const $selected = $(this).find(':selected');

                if ($selected.data('href')) {
                    window.location.href = $selected.data('href');
                }
            });
    }
};
