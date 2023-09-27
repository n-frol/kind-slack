"use strict";

var keyboardAccessibility = require("base/components/keyboardAccessibility");
var _ = require("lodash");

var clearSelection = function (element) {
    $(element)
        .closest(".dropdown.show")
        .children(".nav-link")
        .attr("aria-expanded", "false");
    $(element).closest(".dropdown.show").removeClass("show");
    $(element)
        .closest(".dropdown")
        .children(".dropdown-menu")
        .children(".top-category")
        .detach();
    $(element).closest("li").detach();
};

$(document).ready(function () {
    $.ajax({
        url: "/searchmenu?cgid=kind-nut-bars",
        cache: true
    }).done(function (html) {
        $(".mid-suggest").html(html);
        $(".left-menu ul li:first-child").addClass("greyback");
    });
    var isshow = sessionStorage.getItem("isshow");
    if (isshow) $(".header-banner").hide();

    var ts;
    $(".main-menu").bind("touchstart", function (e) {
        ts = e.originalEvent.touches[0].clientY;
    });

    $(".main-menu").bind("touchend", function (e) {
        var te = e.originalEvent.changedTouches[0].clientY;
        if (ts > te + 5) {
            $(".header-banner").addClass("hide");
        } else if (ts < te - 5) {
            $(".header-banner").removeClass("hide");
        }
    });
});

$(".shopmenu .left-menu ul li").on("mouseenter click tap", function () {
    $(".left-menu ul li").removeClass("grey-background");
    if (
        !/Mobi|Android/i.test(navigator.userAgent) &&
        !$(this).parent().parent().hasClass("aboutleft")
    ) {
        $(this).not(":last-child").addClass("grey-background");
    }
    var pname = $(this).data("name");
    var pimg = $(this).data("img");
    var overlay = $(this).data("overlay");
    var purl = $(this).data("url");
    if (
        pname === undefined &&
        !$(this).parent().parent().hasClass("aboutleft")
    ) {
        // eslint-disable-line
        return;
    }
    $.ajax({
        url: $(this).attr("data-url"),
        cache: true
    }).done(function (html) {
        $(".mid-name").html(pname);
        $(".mid-suggest").html(html);
        $(".mid-image").attr("src", pimg);
        $(".mid-overlay .mid-overlaytext").html(overlay);
        $(".mid-menu .img-link").attr("href", purl);
        if (
            /Mobi|Android|Phone|Pad/i.test(navigator.userAgent) ||
            (navigator.userAgent.match(/Mac/) &&
                navigator.maxTouchPoints &&
                navigator.maxTouchPoints > 2)
        ) {
            $(".mid-menu").show();
            $(".right-menu").hide();
            $(".left-menu").hide();
            $(".top-category .nav-link").html(pname);
        }
    });
});

// Since the scope doesn't allow us to easily find the bottom of the page, determine height dynamically
function setMobileNavHeight() {
    const $nav = $(".js-primary-nav, .navbar");

    if ($nav.length > 0) {
        // Check if $nav has mobile styles
        if ($(window).width() >= 1024) {
            $nav.css("height", "");
            return;
        }

        $nav.css(
            "height",
            "calc(95vh - " +
                ($nav.offset().top - $(window).scrollTop() - ($('.header-banner').length ? 60 : 0)) +
                "px)"
        );
    }
}

module.exports = {
    init() {
        var isDesktop = function (element) {
            return (
                $(element).parents(".menu-toggleable-left").css("position") !==
                    "absolute" &&
                $(element).parents(".menu-toggleable-left").css("position") !==
                    "fixed"
            );
        };

        $(".header-banner .close").on("click", function () {
            $(".header-banner").addClass("hide");
            sessionStorage.setItem("isshow", 1);
        });

        keyboardAccessibility(
            ".main-menu .nav-link, .main-menu .dropdown-link",
            {
                40: function (menuItem) {
                    // down
                    if (!menuItem.parent().closest(".nav-item").length) {
                        // top level
                        $(".navbar-nav .show")
                            .removeClass("show")
                            .children(".dropdown-menu")
                            .removeClass("show");
                        menuItem
                            .addClass("show")
                            .children(".dropdown-menu")
                            .addClass("show");
                        $('.js-header').addClass('has-expanded-menu');
                        $(this).attr("aria-expanded", "true");
                        menuItem.find("ul > li > a").first().focus();
                    } else {
                        menuItem
                            .removeClass("show")
                            .children(".dropdown-menu")
                            .removeClass("show");
                        $(this).attr("aria-expanded", "false");
                        menuItem
                            .nextAll(".nav-item")
                            .first()
                            .children()
                            .first()
                            .focus();
                    }
                },
                39: function (menuItem) {
                    // right
                    // Start with parent so not counting itself
                    if (!menuItem.parent().closest(".nav-item").length) {
                        // top level
                        menuItem
                            .removeClass("show")
                            .children(".dropdown-menu")
                            .removeClass("show");
                        $(this).attr("aria-expanded", "false");
                        menuItem.next().children().first().focus();
                    } else if (menuItem.hasClass("dropdown")) {
                        menuItem
                            .addClass("show")
                            .children(".dropdown-menu")
                            .addClass("show");
                        $(this).attr("aria-expanded", "true");
                        menuItem.find("ul > li > a").first().focus();
                    }
                },
                38: function (menuItem) {
                    // up
                    // Start with parent so not counting itself
                    if (!menuItem.parent().closest(".nav-item").length) {
                        // top level
                        menuItem
                            .removeClass("show")
                            .children(".dropdown-menu")
                            .removeClass("show");
                        $('.js-header').removeClass('has-expanded-menu');
                        $(this).attr("aria-expanded", "false");
                    } else if (menuItem.prev().length === 0) {
                        menuItem
                            .closest(".dropdown.show")
                            .removeClass("show")
                            .children(".nav-link")
                            .attr("aria-expanded", "false");
                        menuItem
                            .parent()
                            .closest(".nav-item")
                            .children()
                            .first()
                            .focus();
                    } else {
                        menuItem.prev().children().first().focus();
                    }
                },
                37: function (menuItem) {
                    // left
                    if (menuItem.hasClass("nav-item")) {
                        // top level
                        menuItem
                            .removeClass("show")
                            .children(".dropdown-menu")
                            .removeClass("show");
                        $(this).attr("aria-expanded", "false");
                        menuItem.prev().children().first().focus();
                    } else {
                        menuItem
                            .closest(".show")
                            .removeClass("show")
                            .closest("li.show")
                            .removeClass("show")
                            .children()
                            .first()
                            .focus()
                            .attr("aria-expanded", "false");
                    }
                },
                27: function (menuItem) {
                    // escape
                    var parentMenu = menuItem.hasClass("show")
                        ? menuItem
                        : menuItem.closest("li.show");
                    parentMenu.children(".show").removeClass("show");
                    parentMenu
                        .removeClass("show")
                        .children(".nav-link")
                        .attr("aria-expanded", "false");
                    parentMenu.children().first().focus();
                    $('.js-header').removeClass('has-expanded-menu');
                }
            },
            function () {
                return $(this).parent();
            }
        );

        // add the bare minimum number of classes to applicable elements to allow header-navigation items to function as dropdowns
        $(".js-header-nav li")
            .has("ul")
            .addClass("st-primary-nav__item dropdown")
            .children("a")
            .addClass("dropdown-toggle st-primary-nav__dropdown-toggle")
            .attr("data-toggle", "dropdown")
            .parent()
            .children("ul")
            .addClass("dropdown-menu st-primary-nav__dropdown");

        $('.dropdown:not(.disabled) [data-toggle="dropdown"]')
            .on("click", function (e) {
                if (!isDesktop(this)) {
                    $(".modal-background")
                        .show()
                        .addClass(
                            "st-modal__background st-modal__menu__background"
                        );
                    // copy parent element into current UL
                    var li = $(
                        '<li class="dropdown-item st-primary-nav__dropdown__top-category top-category" role="button"></li>'
                    );
                    var link = $(this)
                        .clone()
                        .removeClass("dropdown-toggle")
                        .removeClass("st-primary-nav__dropdown-toggle")
                        .removeClass("st-primary-nav__dropdown__link")
                        .removeAttr("data-toggle")
                        .removeAttr("aria-expanded")
                        .attr("aria-haspopup", "false");
                    var closeMenu = $(".close-menu").first().clone();

                    if ($(this).data('name-link')) { // Make functionality opt in by site
                        closeMenu.find('.js-close-menu-link').html(link.find('.js-dropdown-title').html()); // If no element is found for either query, will default to the text already inside the close menu element
                    } else { // Default
                        li.append(link);
                    }
                    $(this).parent().children(".dropdown-menu").prepend(li);
                    li.append(closeMenu);
                    // copy navigation menu into view
                    $(this).parent().addClass("show");
                    $(this).attr("aria-expanded", "true");
                    e.preventDefault();
                }
            })
            .on("mouseenter", function () {
                if (isDesktop(this)) {
                    var eventElement = this;
                    $(".navbar-nav > li").each(function () {
                        if (!$.contains(this, eventElement)) {
                            $(this)
                                .find(".show")
                                .each(function () {
                                    clearSelection(this);
                                });
                            if ($(this).hasClass("show")) {
                                $(this).removeClass("show");
                                $(this)
                                    .children("ul.dropdown-menu")
                                    .removeClass("show");
                                $(this)
                                    .children(".nav-link")
                                    .attr("aria-expanded", "false");
                            }
                        }
                    });
                    // need to close all the dropdowns that are not direct parent of current dropdown
                    $(this).parent().addClass("show");
                    $('.js-header').addClass('has-expanded-menu');
                    $(this).siblings(".dropdown-menu").addClass("show");
                    $(this).attr("aria-expanded", "true");
                }
            })
            .parent()
            .on("mouseleave", function () {
                if (isDesktop(this)) {
                    $(this).removeClass("show");
                    $(this).children(".dropdown-menu").removeClass("show");
                    $(this)
                        .children(".nav-link")
                        .attr("aria-expanded", "false");
                    $('.js-header').removeClass('has-expanded-menu');
                }
            });

        $(".js-navbar-close-button").on("click", function (e) {
            e.preventDefault();
            $(".menu-toggleable-left, .navbar-toggler").removeClass("is-in");
            $('.js-header').removeClass('has-expanded-menu');
            $(".modal-background").hide();
            $('.js-header').removeClass('has-expanded-menu');
        });

        $(".navbar-nav").on("click", ".back", function (e) {
            e.preventDefault();
            if (
                $(".mid-menu").is(":visible") &&
                !$(".aboutmid").is(":visible")
            ) {
                $(".mid-menu").hide();
                $(".left-menu").show();
                $(".right-menu").show();
                $(".top-category .nav-link").html("Shop");
            } else {
                $(".aboutmid").hide();
                clearSelection(this);
            }
        });

        $(".aboutmenu").on("click", function () {
            $(".aboutmid").show();
        });

        $(".navbar-nav").on("click", ".close-button", function (e) {
            e.preventDefault();
            $(".navbar-nav").find(".top-category").detach();
            $(".navbar-nav").find(".nav-menu").detach();
            $(".navbar-nav").find(".show").removeClass("show");
            $(".menu-toggleable-left").removeClass("is-in");
            $(".modal-background").hide();
        });

        // Set up modal for menu use
        var $modalBg = $(".js-modal-background");
        $modalBg
            .addClass(
                "st-modal__background js-modal-menu-background st-modal__menu__background"
            )
            .detach();

        $(".js-header__inner").append($modalBg[0]);

        $(".navbar-toggler").click(function (e) {
            e.preventDefault();
            $("html").toggleClass("navbar-is-in");
            $(this).toggleClass("is-in");
            $(".main-menu").toggleClass("is-in");
            $('.js-header').toggleClass('has-expanded-menu', $(this).hasClass('is-in'));

            $(".js-modal-background").toggle();
        });

        keyboardAccessibility(
            ".navbar-header .user",
            {
                40: function ($popover) {
                    // down
                    if ($popover.children("a").first().is(":focus")) {
                        $popover.children("a").first().next().focus();
                    } else {
                        $popover.children("a").first().focus();
                    }
                },
                38: function ($popover) {
                    // up
                    if ($popover.children("a").first().is(":focus")) {
                        $(this).focus();
                        $popover.removeClass("show");
                    } else {
                        $popover.children("a").first().focus();
                    }
                },
                27: function ($popover) {
                    // escape
                    $(this).focus();
                    $popover.removeClass("show");
                },
                9: function ($popover) {
                    // tab
                    $popover.removeClass("show");
                }
            },
            function () {
                var $popover = $(".user .popover");
                if (!$popover.hasClass("show")) {
                    $popover.addClass("show");
                }
                return $popover;
            }
        );

        $(".navbar-header .user").on("mouseenter focusin", function () {
            if ($(".navbar-header .user .popover").length > 0) {
                $(".navbar-header .user .popover").addClass("show");
            }
        });

        $(".navbar-header .user").on("mouseleave", function () {
            $(".navbar-header .user .popover").removeClass("show");
        });

        // The comp calls for a layout/position of the shop menu's dropdown that isn't really doable without JS.  Adjust the styles here
        function adjustShopNav() {
            return;
        }

        setMobileNavHeight();

        adjustShopNav();
        $(window).resize(_.throttle(adjustShopNav, 100));
        $(window).on("resize", setMobileNavHeight);
    },
    setMobileNavHeight: setMobileNavHeight
};
