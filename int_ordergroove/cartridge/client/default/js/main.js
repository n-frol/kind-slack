window.jQuery = window.$ = require('jquery');
var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('kind/main.js'));
    processInclude(require('./cart/ordergroove-cart'));
    processInclude(require('./ordergroove-common'));
});
