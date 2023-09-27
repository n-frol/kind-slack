'use strict';

/**
 * Contains functionality for determining and manipulating "active links", i.e. those corresponding to the current page
 */

/**
 * For nav bars utitlizing this functionality, mark any active links as such
 */
function setActive() {
    const $activeNavItems = $('.js-active-nav-item');
    if ($activeNavItems.length) {
        const curUrl = window.location.href;
        const curUrlRelative = window.location.pathname + window.location.search;

        $activeNavItems.each(function (i, j) {
            const $dataElem = $(j).closest('.js-active-nav').siblings('.js-active-nav-data'); // Get extra data passed to the DOM by the server
            const dataTarget = $dataElem.length ? $dataElem.attr('data-active-nav-target') : false; // The nav item can be active if its href attribute corresponds to the designated target, not just if it's the current page

            if ($(j).attr('href') && ($(j).attr('href') === curUrl || $(j).attr('href') === curUrlRelative || (dataTarget && $(j).attr('href') === dataTarget))) {
                $(j).addClass('is-active');
            }
        });
    }
}

function pickYourSnacksBox() {
    const $snackBox = $('.js-select-option');
    const $snackBoxBtn = $('.js-snackbox-continue-btn');
    const $badge = $('.c-product-details__img-badge--step2');

    $snackBox.on('click', function () {
        var boxImgs = $snackBox.find('.content-navigation-img');
        boxImgs.css('border', 'none');
        $badge.css('background', 'white').css('color', 'black');

        $(this).find('.content-navigation-img').css('border', '3px solid black');
        $(this).find('.c-product-details__image-border--step2 .c-product-details__img-badge--step2').css('background', 'black').css('color', 'white');

        $snackBoxBtn.attr('data-gtm-pack-type', $(this).attr('data-gtm-pack-type'));
        $snackBoxBtn.attr('data-url', $(this).find('.js-snackbox-url').val());
        $snackBoxBtn.prop("disabled", false);
    });
}

function snackBoxGoToNextStep() {
    var $snackBoxBtn = $('.js-snackbox-continue-btn');
    $snackBoxBtn.on('click', function () {
        $('body').spinner().start();
        window.location = $(this).attr('data-url');
    });
}

module.exports = {
    init() {
        setActive();
        pickYourSnacksBox();
        snackBoxGoToNextStep();
    }
};
