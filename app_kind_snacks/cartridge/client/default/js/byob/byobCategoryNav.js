'use strict';

/**
 * Custom js functionality for the BYOB category nav
 */

const viewportIs = require('../viewport-is');

/**
 * We're only hooking into the default search refinement functionality when clicking a non-active item, to reduce unnecessary code being run
 * Make sure a prevent default is always applied to them
 */
function navItemPreventDefault() {
    $('.container').on('click', 'a.js-category-nav-item', function (e) {
        e.preventDefault();
    });
}

/**
 * Triggers category update with use of category nav carousel as appropriate
 */
function carouselNav() {
    $('.js-slider').on('afterChange', function () {
        if (viewportIs('mobile')) {
            const $curSlide = $('.slick-current a.js-category-nav-item', $(this));

            if ($curSlide.length) {
                $curSlide.trigger('click');
            }
        }
    });
}

/**
 * Toggles the active class for the current category in the nav
 */
function toggleActiveState() {
    $('.container').on('click', 'a.js-category-nav-item:not(.is-active)', function () {
        const $resetBtn = $('.js-refinement-bar a.reset');
        const $slider = $(this).closest('.js-slider');

        if ($resetBtn.length) {
            $resetBtn.attr('href', $(this).attr('href'));
        }
        if ($slider.length) {
            $slider.find('a.js-category-nav-item.is-active').removeClass('is-active');
            $(this).addClass('is-active');
        }
    });
}

/**
 * Updates to perform after category nav AJAX change has finished
 * Includes updating visible URL on page
 */

function updateCategoryNavUrl() {
    $('body').on('byobCategoryNav-update', function (e, data) {
        if (data && data.navItem) {
            const $navItem = data.navItem;

            if ($navItem.length) {
                // Use replaceState instead of pushState because the latter creates previous states which don't refresh properly on going backwards
                window.history.replaceState({ html: $navItem.attr('href'), pageTitle: $navItem.data('label') }, $navItem.data('label'), $navItem.attr('href'));
            }
        }
    });
}

function scrollCategoryIntoView() {
    $('.container').on('click', 'a.js-category-nav-item', function (e) {
        var cid = $(this).attr('data-scid');
        var target = $('#' + cid);
        if (target.length) {
            e.preventDefault();
            $('html, body').stop().animate({
                scrollTop: target.offset().top - 100
            }, 1000);
        }
    });
}

function scrollToTop() {
    $('body').on('click', '.js-scroll-to-top', function (e) {
        $("html, body").animate({ scrollTop: 0 }, "slow");
        return false;
    });
}

module.exports = {
    carouselNav: carouselNav,
    navItemPreventDefault: navItemPreventDefault,
    toggleActiveState: toggleActiveState,
    updateCategoryNavUrl: updateCategoryNavUrl,
    scrollCategoryIntoView: scrollCategoryIntoView,
    scrollToTop: scrollToTop
};
