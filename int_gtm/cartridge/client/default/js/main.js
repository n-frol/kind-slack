window.jQuery = window.$ = require('jquery');
const processInclude = require('base/util');

processInclude(require('int_ordergroove/main.js'));

$(document).ready(function () {
    processInclude(require('./gtm/gtmWrapper.js'));
    processInclude(require('./UTM/applyUTM'));
});
