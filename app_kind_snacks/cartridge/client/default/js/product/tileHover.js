/* eslint-disable no-undef */
/* eslint-disable no-console */
'use strict';

/**
 * Generates the modal window on the first call.
 * @param {boolean} swapTileImage - Determines hover image swap
 */
function swapTileImage() {
    $('.tile-image').on('mouseover', function () {
        var hoversrc = $(this).attr('data-hover');
        if (!hoversrc) return;
        var hoversrcset = $(this).attr('data-hoversrcset');
        $(this).prop({ src: hoversrc, srcset: hoversrcset });
    }).on('mouseout', function () {
        var hoversrc = $(this).attr('data-hover');
        if (!hoversrc) return;
        var origsrc = $(this).attr('data-origsrc');
        var origsrcset = $(this).attr('data-origsrcset');
        $(this).prop({ src: origsrc, srcset: origsrcset });
    });
}
module.exports = swapTileImage;
