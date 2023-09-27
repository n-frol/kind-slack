'use strict';

/**
 * Toggles namespaced 'active' class on html element.
 * 'href' value is used for the namespace for links and 'data-js-toggle-ns' for buttons. If target
 * is not an 'a[href]' or 'button' the click will not be bound.
 *
 * Originally pulled in from SPL
 */

const $html = $('html');

const aToggle = {
    activeClasses: [],
    activeNS: [],
    clearAll() {
        // Clear all active aToggle classes.
        // Only one should be active at a time.
        aToggle.activeClasses.forEach(ac => {
            $html.removeClass(ac);
        });
        aToggle.activeClasses = [];
        aToggle.activeNS = [];
    },
    init() {
        $('body')
        .on('click', '.js-a-toggle', e => {
            e.preventDefault();
            e.stopPropagation();

            const $tgt = $(e.currentTarget);

            if ($tgt.attr('href')) {
                const ns = $tgt.attr('href').replace(/[^a-z-]/ig, '');
                const activeClass = `is-${ns}-active`;
                const isActive = $html.is(`.${activeClass}`);

                aToggle.clearAll();

                if (!isActive) {
                    $html.addClass(activeClass);
                    // Log class to be cleared later by another toggle if necessary.
                    aToggle.activeClasses.push(activeClass);
                    aToggle.activeNS.push(ns);
                }

                // Focus to element with ID if set in "data-js-a-toggle-focus"
                // of target link.
                const focusID = $tgt.data('js-a-toggle-focus');
                const $focusEl = $(`#${focusID}`);
                if ($focusEl.length) {
                    $focusEl.click().focus();
                }

                // Animate.
                if ($tgt.hasClass('.js-a-toggle--animate')) {
                    const $animateTgt = $($tgt.attr('href'));
                    if ($animateTgt.length) {
                        $animateTgt.slideToggle();
                    }
                }
            }
        })
        .on('click', '.js-btn-toggle', e => {
            e.preventDefault();
            e.stopPropagation();

            const $tgt = $(e.currentTarget);

            if ($tgt.data('js-toggle-ns')) {
                const ns = $tgt.data('js-toggle-ns').replace(/[^a-z-]/ig, '');
                const activeClass = `is-${ns}-active`;
                const isActive = $html.is(`.${activeClass}`);

                aToggle.clearAll();

                if (!isActive) {
                    $html.addClass(activeClass);
                    // Log class to be cleared later by another toggle if necessary.
                    aToggle.activeClasses.push(activeClass);
                    aToggle.activeNS.push(ns);
                }

                // Focus to element with ID if set in "data-js-a-toggle-focus"
                // of target link.
                const focusID = $tgt.data('js-toggle-focus');
                const $focusEl = $(`#${focusID}`);
                if ($focusEl.length) {
                    $focusEl.click().focus();
                }

                // Animate.
                if ($tgt.hasClass('.js-btn-toggle--animate')) {
                    const $animateTgt = $($tgt.data('js-toggle-ns'));
                    if ($animateTgt.length) {
                        $animateTgt.slideToggle();
                    }
                }
            }
        })
        .on('click', '[data-js-toggle-close]', e => {
            e.preventDefault();
            aToggle.clearAll();
        })
        .on('click', e => {
            var doClear = true;
            for (let i = 0; i < aToggle.activeNS.length; i++) {
                let ns = aToggle.activeNS[i];
                if ($(e.target).closest(`#${ns}`).length) {
                    doClear = false;
                    break;
                }
            }

            if (doClear) {
                aToggle.clearAll();
            }
        });
    }
};

module.exports = aToggle;
