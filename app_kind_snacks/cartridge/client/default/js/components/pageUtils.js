'use strict';

var pageLastY = 0;
/**
 * Prevents scrolling up when already at the top of the page
 * Alleviates the iOS issue of "overscroll" or "scroll bouncing"
 */
function preventIosOverscroll() {
    $('.page').on('touchstart', function (e) {
        pageLastY = e.targetTouches[0].pageY;
    });
    $('.page').on('touchmove', function (e) {
        // Account for different browsers handling scrollTop differently.  Makes sure this fix doesn't break anything
        const pageScrollTop = Math.max($('body').scrollTop(), $(window).scrollTop());
        var isUp = e.targetTouches[0].pageY > pageLastY;

        pageLastY = e.targetTouches[0].pageY;

        if (isUp && pageScrollTop <= 0) {
            e.preventDefault();
        }
    });
}

module.exports = {
    preventIosOverscroll: preventIosOverscroll
};
