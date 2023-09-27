'use strict';

var processInclude = require('base/util');

require('kind/productDetail');

$(document).ready(function () {
    processInclude(require('./product/ordergroove-pdp'));
});
