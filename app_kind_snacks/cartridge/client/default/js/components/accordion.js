"use strict";

window.accordionLastOpened =
    window.accordionLastOpened == null ? "" : window.accordionLastOpened;

module.exports = function () {
    var isByob =
        window.location.pathname.indexOf("/search") > -1 &&
        window.location.search.indexOf("cgid=byob") > -1;

    $(".js-accordion-header").on("click", function () {
        var divToClose = $(".js-accordion-header.has-expanded");
        if (divToClose === $(this) || $(this).hasClass("has-expanded")) {
            $(this)
                .removeClass("has-expanded")
                .next(".js-accordion-body")
                .slideUp(300);
        } else {
            divToClose
                .removeClass("has-expanded")
                .next(".js-accordion-body")
                .slideUp(300);
            $(this)
                .addClass("has-expanded")
                .next(".js-accordion-body")
                .slideDown(300);
        }

        if (isByob) {
            var classList = $(this).parent(".c-refinements__card")[0].classList;
            window.accordionLastOpened = classList[classList.length - 1];
        }
    });

    if (isByob && window.accordionLastOpened) {
        $("." + window.accordionLastOpened)
            .children(".js-accordion-body")
            .show()
            .prev(".js-accordion-header")
            .addClass("has-expanded");
    } else if (!isByob) {
        $(".is-checked")
            .parents(".js-accordion-body")
            .show()
            .prev(".js-accordion-header")
            .addClass("has-expanded");
    }

    if ($(".is-checked").length) {
        $(".c-byob-redesign__chips-wrapper .c-byob-redesign__chips-wrapper__reset_btn").css("display", "block");
    } else {
        $(".c-byob-redesign__chips-wrapper .c-byob-redesign__chips-wrapper__reset_btn").css("display", "none");
    }
};
