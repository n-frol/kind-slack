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
};
