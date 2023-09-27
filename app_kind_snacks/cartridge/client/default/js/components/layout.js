'use strict';

module.exports = function () {
    if ($(".js-hide-filters").is(":visible")) {
        $('.search-results').removeClass('v2');
        $('.product-grid').removeClass('product-grid-v2');
        $('.js-refinement-bar').removeClass('col-12 has-collapsed').addClass('col-md-3');
        $(".js-content-box").removeClass("col-md-12").addClass("col-md-9");
        $(".js-product-tile").removeClass("hide-texture");
        $('.callout-top').removeClass('callout-top');
    }
    $(".js-switch-filters").on("click", function () {
        if ($(".js-hide-filters").is(":visible")) {
            $(".js-hide-filters").fadeOut(200, function () {
                $(".js-hide-filters").siblings(".js-show-filters").fadeIn(300);
            });
            $(".js-refinement-bar").addClass("has-collapsed");
            $(".js-content-box").removeClass("col-md-9").addClass("col-md-12");
        } else if ($(".js-show-filters").is(":visible")) {
            $(".js-show-filters").fadeOut(200, function () {
                $(".js-show-filters").siblings(".js-hide-filters").fadeIn(300);
            });
            $(".js-refinement-bar").removeClass("has-collapsed");
            $(".js-content-box").removeClass("col-md-12").addClass("col-md-9");
        }
    });
};

$(document).ready(function () {
    if (navigator.userAgent.match(/(iPod|iPhone)/)) {
        $(".menu-footer li").css("margin-bottom", "20px");
    }
});
