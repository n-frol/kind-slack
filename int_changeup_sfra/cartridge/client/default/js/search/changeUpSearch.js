'use strict';

/**
 * Performs a jQuery Search.
 * @param {Object} query Search criteria.
 * @param {Object} $input The Input.
 * @param {Object} cb Callback.
 */
function search(query, $input, cb) {
    if (!query) {
        return;
    }

    jQuery.ajax({
        url: $input.data('url'),
        data: {
            query: query
        }
    })
    .done(function (data) {
        if (data && data.results && data.results.length) {
            cb(data.results);
        }
    });
}

module.exports = function () {
    var autocomplete = require('autocomplete.js');
    var $wrapper = $('#search-tile-wrapper');
    var $searchInput = $wrapper.find('#search');
    var $button = $wrapper.find('.charity-select');

    autocomplete($searchInput[0], {
        hint: false,
        minLength: 3
    }, [{
        source: function (query, cb) {
            search(query, $searchInput, cb);
        },
        displayKey: function (suggestion) {
            return suggestion.name + ' - ' + suggestion.location;
        },
        debounce: 500
    }])
    .on('autocomplete:selected', function (event, suggestion, dataset, context) { // eslint-disable-line no-unused-vars
        $button.data('uuid', suggestion.uuid);
        $button.data('charityname', suggestion.display);

        $button.prop('disabled', false);
    });
};
