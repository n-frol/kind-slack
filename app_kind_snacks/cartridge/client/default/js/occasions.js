/* eslint-disable */
'use strict';
var processInclude = require('base/util');

processInclude(require('./product/quickView'));

function scrollToAnchor(aid) {
    console.log(aid);
    $([document.documentElement, document.body]).animate({
        scrollTop: $("#"+aid).offset().top - 100
    }, 2000);
    // now account for fixed header
    var scrolledY = window.scrollY;

    if (scrolledY) {
        window.scroll(0, scrolledY - 100);
    }
}

$("#scrollselect").change(function () {
    var optionSelected = $("option:selected", this).data("scroll");
    scrollToAnchor(optionSelected);
});

var observer = new IntersectionObserver(function (entries) {
    // no intersection with screen
    if (entries[0].intersectionRatio === 0) {
        document.querySelector(".sticker").classList.add("nav-container-sticky");
    }
    if (entries[0].intersectionRatio === 1) {
        document.querySelector(".sticker").classList.remove("nav-container-sticky");
    }
}, { threshold: [0, 1] });

observer.observe(document.querySelector(".sticky-top-container"));

if (window.navigator.userAgent.indexOf("Edge") > -1) {
    $(".sticker").addClass("stickerie");
}

if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
    $(".sticker").addClass("topsticker");
}
