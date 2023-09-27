'use strict';

/**
 * Shows an error from ChangeUp.
 * @param {string} errorMsg Error message details.
 */
function displaySearchError(errorMsg) {
    var $error = jQuery('#search-error');

    $error.text(errorMsg);
    $error.removeClass('hide');

    setTimeout(function () {
        $error.addClass('hide');
    }, 10000);
}

/**
 * Search.
 * @param {Object} query Search Criteria.
 * @param {function} cb Search Callback.
 */
function search(query, cb) {
    if (!query) {
        return;
    }

    var exclusions = [];
    var requireVerified = jQuery('#roundup-whole-flag').prop('checked');

    jQuery('#category-exclusions option:selected').each((i, e) => {
        exclusions.push(e.value);
    });

    jQuery.ajax({
        url: jQuery('#charity-search').data('url'),
        method: 'post',
        data: {
            query: query,
            exclude: exclusions.toString(),
            requireVerified: requireVerified
        }
    })
    .done(function (data) {
        if (data && data.length) {
            if (data[0].error) {
                displaySearchError(data[0].error);
                return null;
            }

            cb(data);
        }

        return null;
    });
}

module.exports = function () {
    var autocomplete = require('autocomplete.js');

    autocomplete('#charity-search', {
        hint: false,
        minLength: 3
    }, [{
        source: function (query, cb) {
            search(query, cb);
        },
        displayKey: function (suggestion) {
            return suggestion.name + ' - ' + suggestion.location;
        },
        debounce: 500
    }])
    .on('autocomplete:selected', function (event, suggestion, dataset, context) { // eslint-disable-line no-unused-vars
        var $searchInput = jQuery('#charity-search');

        $searchInput.prop('disabled', true);
        $searchInput.data('charity-data', suggestion);

        jQuery('#charity-button-wrapper').removeClass('hide');
    });
};
