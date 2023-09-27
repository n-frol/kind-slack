'use strict';

module.exports = function () {
    $('body').on('change', '.order-history-select', function (e) {
        var baseUrl = window.location.href.split('?')[0];

        var queryString;
        if (e.currentTarget.value.split('?').length > 1) {
            queryString = e.currentTarget.value.split('?')[1];
        }

        window.location.href = baseUrl + '?' + queryString;
    });
};

