/* global $ */

'use strict';

var processInclude = require('base/util');

$(window).on('load', function () {
    processInclude(require('./checkout/checkout'));
});
