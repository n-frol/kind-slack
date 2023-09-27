'use strict';

/**
 * Toggles class that tells the header whether to be sticky
 * Mimics position: sticky behavior where it kicks in to keep the element at the top of the page
 * Using this instead of position: sticky due to cover for support
 *
 * Originally pulled in from SPL
 */

const _ = require('lodash');
const menu = require('./menu');

const stickyClass = 'has-sticky-header';
const $html = $('html');
const $body = $('body');
const $topBanner = $('header');

let topBannerHeight = $topBanner.outerHeight();
let headerOffsetTop = $topBanner.offset().top || 0;

const doSticky = () => {
    const scrollTop = Math.max($html.scrollTop(), $body.scrollTop());
    const isSticky = scrollTop >= headerOffsetTop;
    const $siteSearch = $('.js-site-search');
    $html.toggleClass(stickyClass, isSticky);
    $body.css('padding-top', isSticky ? topBannerHeight : '');

    menu.setMobileNavHeight();

    // Equivalent to 100vh minus the distance from the top of the page to the start of the suggestions window
    if ($siteSearch.length) {
        var suggestionMaxHeight = window.innerHeight - (($siteSearch.offset().top - $(window).scrollTop()) + $('.js-site-search').outerHeight());
        $('.js-suggestions-wrapper').css('max-height', suggestionMaxHeight + 'px');
    }
};

const resetSticky = () => {
    $html.removeClass(stickyClass);
    $body.css('padding-top', '');

    menu.setMobileNavHeight();
    $('body').trigger('afterSetMobileNavHeight');
    topBannerHeight = $topBanner.outerHeight();
    headerOffsetTop = $topBanner.offset().top || 0;
    doSticky();
};

module.exports = function () {
    doSticky();
    $(window)
        .on('scroll', _.throttle(doSticky, 20))
        .on('resize', _.throttle(resetSticky, 100));
};
