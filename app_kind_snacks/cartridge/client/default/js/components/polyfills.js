'use strict';

/**
 * Define custom polyfills here
 */

function getTrueVhUnit() {
    const smBreakpoint = window.getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-sm');
    const smBreakpointValue = +smBreakpoint.slice(0, -2);
    if (window.innerWidth <= smBreakpointValue) {
        const vh = window.innerHeight * 0.01; // Convert to 1vh
        document.documentElement.style.setProperty('--trueVh', `${vh}px`);
        return;
    }

    document.documentElement.style.setProperty('--trueVh', ''); // We don't need the value for desktop, so clear it to use the fallback set in CSS
}

module.exports = {
    methods: {
        getTrueVhUnit: getTrueVhUnit
    },
    objectAssign: function () {
        // Create polyfill for Object.assign, as Babel doesn't appear to cover it
        if (!Object.assign || typeof Object.assign !== 'function') {
            require('es6-object-assign').polyfill();
        }
    },

    /**
     * Sets a "true" vh unit as a CSS variable
     * Mobile browsers don't, for example, scale the vh unit based on whether or not the top or bottom browser bar is visible
     * This should only be used in cases where it's definitely needed to prevent "jumping"
     */
    trueVhUnit: function () {
        var throttle = require('lodash/throttle');
        var throttledGetTrueVhUnit = throttle(getTrueVhUnit, 150);
        const smBreakpoint = window.getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-sm');
        // If the breakpoint value isn't set at all, we're on a browser not supports CSS vars
        if (smBreakpoint) {
            $(window).on('resize', throttledGetTrueVhUnit);
        }
    }
};
