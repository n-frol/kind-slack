'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./product/quickView'));
});

if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) { // eslint-disable-line no-use-before-define
    $(".ribbon").addClass("safari_ribbon");
}
