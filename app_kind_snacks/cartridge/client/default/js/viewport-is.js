'use strict';

module.exports = (viewport) => {
    const currentViewport = window.getComputedStyle(document.querySelector('body'), '::after').getPropertyValue('content').replace(/"/g, '');
    return viewport.indexOf(currentViewport) > -1;
};
