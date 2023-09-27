'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('base/profile/profile'));
    processInclude(require('./profile/profileLoginRadius'));
});
