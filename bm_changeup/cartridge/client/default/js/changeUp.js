window.jQuery = require('jquery');
jQuery.noConflict();
var processInclude = require('./util');

jQuery(document).ready(function ($) {  // eslint-disable-line no-unused-vars
    processInclude(require('./search/search'));
    processInclude(require('./dashboard/dashboard'));
});
