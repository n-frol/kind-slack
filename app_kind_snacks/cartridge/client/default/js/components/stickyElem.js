'use strict';

/**
 * For making elements sticky below the header
 */

const _ = require('lodash');

const $html = $('html');
const $body = $('body');
const $topBanner = $('header');

let topBannerHeight = $topBanner.outerHeight();
let headerOffsetTop = 0;
let stickyStyles = {
    left: '',
    top: '',
    width: ''
};
let bottomDrawerHeight = 0; // How far from bottom of the page the top of the recently viewed items box is
let newBottomDrawerHeight = 0;
let amtFooterVisible = 0;
let newAmtFooterVisible = 0;
let cutoff = 0;

document.body.style.setProperty('--header-height', topBannerHeight + 'px');

const setStickyBottom = (j) => {
    if (!$(j).hasClass('is-sticky')) {
        return;
    }

    let savedScrollTop = $(j).scrollTop(); // save scrollTop before removing bottom so we can preserve it and not have the scroll bar potentiall jump around
    $(j).css('bottom', ''); // reset bottom to get accurate height
    let fromBottom = window.innerHeight - (topBannerHeight + 25 + $(j).outerHeight());

    // Only cut off if there's a visible element that merits a cutoff and the element actually reaches the cut off
    if (cutoff > 0 && fromBottom < cutoff) {
        $(j).addClass('is-sticky--custom-bottom');
        $(j).css('bottom', cutoff + 'px')
            .scrollTop(savedScrollTop);
    } else if ($(j).hasClass('is-sticky--custom-bottom') && bottomDrawerHeight === 0) {
        $(j).removeClass('is-sticky--custom-bottom');
    }
};

// Methods are declared outside of modules.export despite being used there
// This ends up being the simplest way to allow the throttled resetSticky to still be able to access doSticky
const doSticky = () => {
    const scrollTop = Math.max($html.scrollTop(), $body.scrollTop());
    const footerOffset = $('footer').offset().top;
    const windowBottom = $(window).scrollTop() + window.innerHeight;
    newAmtFooterVisible = windowBottom - Math.ceil(footerOffset);

    if (newBottomDrawerHeight !== bottomDrawerHeight) {
        bottomDrawerHeight = newBottomDrawerHeight;
    } else if (amtFooterVisible <= 0 && newAmtFooterVisible <= 0) {
        // If there's no change in the drawer "height", and the footer is, and was below the visible window, there's no need to reapply the drawer "height" as the bottom attribute

        newBottomDrawerHeight = 0;
    }
    amtFooterVisible = newAmtFooterVisible;

    cutoff = Math.max(amtFooterVisible, newBottomDrawerHeight);

    $('.js-sticky-elem').each(function (i, j) {
        // Uses the parent as an anchor to know where to go on/off sticky
        let offsetFromHeader = $(j).parent().offset().top - headerOffsetTop - topBannerHeight;
        let stickyPoint = (headerOffsetTop + offsetFromHeader);

        if (scrollTop > stickyPoint && !$(j).hasClass('is-sticky')) {
            let newStickyStyles = {
                left: $(j).parent().offset().left,
                top: topBannerHeight,
                width: $(j).parent().outerWidth()
            };

            $(j).css(newStickyStyles)
                .addClass('is-sticky');

            if (!$('html').hasClass('has-sticky-elem')) {
                $('html').addClass('has-sticky-elem');
            }
        } else if (scrollTop < stickyPoint && $(j).hasClass('is-sticky')) {
            $(j).removeClass('is-sticky')
                .removeClass('is-sticky--custom-bottom')
                .css(stickyStyles);


            return true;
        }

        if ($(j).data('footer-cutoff') === true) {
            setStickyBottom(j);
        }

        return true;
    })
    .promise().done(function () {
        if ($('html').hasClass('has-sticky-elem') && !$('.js-sticky-elem.is-sticky').length) {
            $('html').removeClass('has-sticky-elem');
        }
    });
};
const resetSticky = () => {
    topBannerHeight = $topBanner.outerHeight();
    headerOffsetTop = $topBanner.offset().top || 0;
    document.body.style.setProperty('--header-height', topBannerHeight + 'px');

    $('.js-sticky-elem.is-sticky').removeClass('is-sticky')
        .removeClass('is-sticky--custom-bottom')
        .css(stickyStyles);
    $('html').removeClass('has-sticky-elem');

    doSticky();
};

module.exports = {
    method: {
        doSticky: doSticky
    },
    init() {
        doSticky();

        $(window)
            .on('scroll', _.throttle(doSticky, 30));

        // Do resetSticky after setMobileNavHeight has run to ensure the sticky elements are set relative to the correct header height
        $('body').on('afterSetMobileNavHeight', resetSticky);

        // Make sure the sticky bottom is properly adjusted when toggling an accordion without having to scroll
        $('body').on('click', '.js-sticky-elem.is-sticky .js-accordion__target', function () {
            setTimeout(function (j) {
                setStickyBottom($(j).closest('.js-sticky-elem.is-sticky')[0]);
            }, 100, this); // Wait 100ms to try and be sure the accordion has done its thing first
        });
    }
};
