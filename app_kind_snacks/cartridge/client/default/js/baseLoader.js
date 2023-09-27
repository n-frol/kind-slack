/* global $ */

'use strict';

/**
 * Provides a loader for base.js for pages that don't get access to it via the normal JS structure but need it
 */

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('kind/product/base'));
});
