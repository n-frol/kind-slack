/* global $ */
'use strict';

require('intersection-observer');

/**
 * Scripts for controlling daily timeline components
 */

module.exports = {
    preventReclick() {
        // Prevent users from triggering click events on active link, preventing issues
        $('body')
            .on('click', '.js-daily-timeline__link--selected', function (e) {
                e.preventDefault();
            });
    },
    timelineClick() {
        $('body')
            .on('click', '.js-daily-timeline__link', function () {
                const $parent = $(this).closest('.js-daily-timeline');

                if (!$(this).hasClass('c-daily-timeline__timeline__link--selected')) {
                    $parent.find('.js-daily-timeline__link').removeClass('c-daily-timeline__timeline__link--selected');
                    $(this).addClass('c-daily-timeline__timeline__link--selected');
                }
            });
    },
    timelineScroll() {
        var timelineObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const $target = $(entry.target);
                    const $timeline = $target.siblings('.js-daily-timeline__wrap');

                    if ($timeline.length) {
                        const $link = $timeline.find(`#${$target.attr('id')}-timeline-link.js-daily-timeline__link`);

                        if (!$link.hasClass('js-daily-timeline__link--selected')) {
                            $timeline.find('.js-daily-timeline__link').removeClass('c-daily-timeline__timeline__link--selected')
                                .removeClass('js-daily-timeline__link--selected');
                            $link.addClass('c-daily-timeline__timeline__link--selected')
                                .addClass('js-daily-timeline__link--selected');
                        }
                    }
                }
            });
        }, { threshold: 0.6 });

        var timelineEntries = document.querySelectorAll('.js-daily-timeline__entry');
        if (timelineEntries) {
            Object.keys(timelineEntries).forEach(key => {
                timelineObserver.observe(timelineEntries[key]);
            });
        }
    }
};
