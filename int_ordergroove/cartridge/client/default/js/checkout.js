'use strict';

var processInclude = require('base/util');
require('kind/checkout');

$(document).ready(function () {
    processInclude(require('./checkout/ordergroove-billing'));
});
