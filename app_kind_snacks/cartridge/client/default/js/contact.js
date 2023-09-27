'use strict';

// Load js specific to the Contact Us page

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./contact/contact'));
});
