'use strict';
var processInclude = require('base/util');
processInclude(require('./product/quickView'));
var topoff = 100;
$(".scrolling_dropdown").change(function () {
    var optionSelected = $("option:selected", this).data("scroll");
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        topoff = 150;
    }
    $('html, body').animate({
        scrollTop: ($('#' + optionSelected).offset().top - topoff)
    }, 500);
});
