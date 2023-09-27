'use strict';

/**
 * Load select2 for styling dropdowns
 * Any custom styles for select2 go here as well
 */

// Initial loading of select2
function initSelect2Dropdowns() {
    $('.select2-fancy-select').each(function (ind, dropdown) {
        const $dropdown = $(dropdown);

        $dropdown.select2({
            containerCssClass: $dropdown.attr('class') + ' s-select2',
            dropdownCssClass: 's-select2',
            minimumResultsForSearch: Infinity
        })
            // uncomment .hide() and remove semi-colon from above when done comparing the original and select2 dropdowns
            .hide(); // Hide search
    });
}

module.exports = {
    init() {
        initSelect2Dropdowns();
    }
};
