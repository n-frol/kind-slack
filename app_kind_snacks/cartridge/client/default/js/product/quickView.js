/* eslint-disable no-undef */
/* global POWERREVIEWS */
'use strict';

var baseQuickview = require('base/product/quickView');
var base = require('./base');
var quickViewHelpers = require('./quickViewHelpers');

/**
 * Generates the modal window on the first call.
 *
 * @param {boolean} isBlockedAccess - Whether or not access to the product's pdp is blocked
 */
function getModalHtmlElement(isBlockedAccess) {
    if ($('#quickViewModal').length !== 0) {
        $('#quickViewModal').remove();
    }
    var htmlString = '<!-- Modal -->'
        + '<div class="modal fade st-modal-quickview" id="quickViewModal" role="dialog" aria-labelledby="productName">'
        + '<div class="modal-dialog quick-view-dialog st-modal-quickview__dialog st-modal__dialog">'
        + '<!-- Modal content-->'
        + '<div class="modal-content st-modal-quickview__content st-modal__content">'
        + '<div class="modal-header st-modal-quickview__header st-modal__header">'
        + (!isBlockedAccess ? '<a href="" ' : '<div ') + ' class="full-pdp-link st-modal-quickview__header__link">' + (!isBlockedAccess ? 'View Full Details</a>' : 'Product Details</div>')
        + '    <button type="button" class="close pull-right st-modal-quickview__header__close st-modal__close" data-dismiss="modal" aria-label="Close">'
        + '    </button>'
        + '</div>'
        + '<div class="modal-body st-modal-quickview__body st-modal__body"></div>'
        + '<div class="modal-footer st-modal-quickview__footer st-modal__footer"></div>'
        + '</div>'
        + '</div>'
        + '</div>';
    $('body').append(htmlString);
}

/**
 * Generates the modal window on the first call.
 *
 */
function getInfoModalHtmlElement() {
    if ($('#quickViewModal').length !== 0) {
        $('#quickViewModal').remove();
    }
    var htmlString = '<!-- Modal -->'
        + '<div class="modal fade st-modal-quickview" id="quickViewModal" role="dialog" aria-labelledby="productName">'
        + '<div class="modal-dialog quick-view-dialog st-modal-quickview__dialog st-modal__dialog">'
        + '<!-- Modal content-->'
        + '<div class="modal-content st-modal-quickview__content st-modal__content">'
        + '<div class="modal-header st-modal-quickview__header st-modal__header d-none d-md-flex">'
        + '    <span></span>'
        + '    <button type="button" class="close pull-right st-modal-quickview__header__close st-modal__close" data-dismiss="modal" aria-label="Close">'
        + '    </button>'
        + '</div>'
        + '<div class="modal-body st-modal-quickview__body st-modal__body"></div>'
        + '    <button type="button" class="close pull-right st-modal-quickview__header__close st-modal-quickview__header__close--info st-modal__close d-md-none" data-dismiss="modal">'
        + '    </button>'
        + '<div class="modal-footer st-modal-quickview__footer st-modal__footer"></div>'
        + '</div>'
        + '</div>'
        + '</div>';
    $('body').append(htmlString);
}

function mergeObjects() {
    var resObj = {};
    var j;
    var obj;
    var keys;

    for (var x = 0; x < arguments.length; x += 1) {
        obj = arguments[x];
        keys = Object.keys(obj);

        for (j = 0; j < keys.length; j += 1) {
            resObj[keys[j]] = obj[keys[j]];
        }
    }
    return resObj;
}

/**
 * @typedef {Object} QuickViewHtml
 * @property {string} body - Main Quick View body
 * @property {string} footer - Quick View footer content
 */

// Keeping parseHtml here only because it's not exported by the base quickview

/**
 * Parse HTML code in Ajax response
 *
 * @param {string} html - Rendered HTML from quickview template
 * @return {QuickViewHtml} - QuickView content components
 */
function parseHtml(html) {
    var $html = $('<div>').append($.parseHTML(html));

    var body = $html.find('.product-quickview');
    var footer = $html.find('.modal-footer').children();

    return { body: body, footer: footer };
}

/**
 * replaces the content in the modal window on for the selected product variation.
 * @param {string} productUrl - url to be used for going to the product details page
 * @param {string} selectedValueUrl - url to be used to retrieve a new product model
 * @param {string} selector - Optional jQuery selector to specify a modal
 */
function fillModalElement(productUrl, selectedValueUrl, selector) {
    $('.modal-body').spinner().start();
    $.ajax({
        url: selectedValueUrl,
        method: 'GET',
        dataType: 'html',
        success: function (html) {
            var parsedHtml = parseHtml(html);

            if (selector) {
                $(`${selector} .modal-body`).empty();
                $(`${selector} .modal-body`).html(parsedHtml.body);
                $(`${selector} .modal-footer`).html(parsedHtml.footer);

                // Reset img srcs
                // Safari has bug where it won't properly load images with srcsets
                $(`${selector} .modal-body img`).each(function (ind, img) {
                    const $img = $(img);

                    if (!$img.attr('srcset')) {
                        return true;
                    }

                    const src = $img.attr('src');
                    $img.attr('src', '');
                    $img.attr('src', src);

                    return true;
                });
            } else {
                $('.modal-body').empty();
                // $('.modal-body').html(html);
                $('.modal-body').html(parsedHtml.body);
                $('.modal-footer').html(parsedHtml.footer);

                // Reset img srcs
                // Safari has bug where it won't properly load images with srcsets
                $('.modal-body img').each(function (ind, img) {
                    const $img = $(img);

                    if (!$img.attr('srcset')) {
                        return true;
                    }

                    const src = $img.attr('src');
                    $img.attr('src', '');
                    $img.attr('src', src);

                    return true;
                });
            }

            $('#quickViewModal .full-pdp-link').attr('href', productUrl);
            $('#quickViewModal .size-chart').attr('href', productUrl);
            $('#quickViewModal').modal('show');
            $.spinner().stop();

            quickViewHelpers.quickviewImageSlider();
            $('#quickViewModal').trigger('quickview:afterShow');
            // eslint-disable-next-line no-undef
            if (Yotpo) {
                var api = new Yotpo.API(yotpo);
                api.refreshWidgets();
            }
        },
        error: function () {
            $.spinner().stop();
        }
    });
}

function initQuickviewPowerReviews(selector) {
    if (POWERREVIEWS && POWERREVIEWS.display) {
        const $quickView = $(selector);

        if ($quickView.length) {
            const $tile = $quickView.find('[data-pwr-itemid]');
            window.quickView = $quickView;

            if ($tile.length) {
                const pageIdValue = $tile.attr('data-pwr-itemid');
                const uniqueId = 'category-snippet-'.concat(Math.random().toString(36).substr(2, 16));

                $tile.attr('id', uniqueId);

                var reviewObj = mergeObjects({}, window.POWER_REVIEWS_CONFIG, {
                    page_id: pageIdValue,
                    components: {
                        CategorySnippet: uniqueId
                    }
                });

                if ($tile.hasClass('pwr-pdp')) {
                    reviewObj.components = {
                        ReviewSnippet: uniqueId
                    };
                }

                POWERREVIEWS.display.render([reviewObj]);
            }
        }
    }
}

/**
 * Customizes the og_settings variable so the OG widget displays correctly for a given product in quickview
 *
 * @param {Object} $btn - jQuery object for the button being clicked
 */
function setQuickviewOgSettings($btn) {
    if (window.og_settings) {
        window.og_settings.impulse_upsell = $btn.attr('data-impulse-upsell') === "true" || false;
    }
}

var quickView = Object.assign({}, baseQuickview);

quickView.methods = {
    setQuickviewOgSettings: setQuickviewOgSettings
};

quickView.showQuickview = function () {
    $('body').on('click', '.quickview', function (e) {
        e.preventDefault();
        var selectedValueUrl = $(this).closest('.quickview').data('link');
        var productUrl = selectedValueUrl.replace('Product-ShowQuickView', 'Product-Show');
        $(e.target).trigger('quickview:show');
        getModalHtmlElement(!!$(this).closest('.quickview').data('is-blocked-access'));
        fillModalElement(productUrl, selectedValueUrl, '#quickViewModal');
        setQuickviewOgSettings($(this));
    });
};

quickView.showInfoQuickview = function () {
    $('body').on('click', '.js-info-quickview', function (e) {
        e.preventDefault();
        var selectedValueUrl = $(this).closest('.js-info-quickview').data('link');
        var productUrl = selectedValueUrl.replace('Product-ShowQuickView', 'Product-Show');
        $(e.target).trigger('quickview:show');
        getInfoModalHtmlElement();
        fillModalElement(productUrl, selectedValueUrl, '#quickViewModal');

        $('#quickViewModal').on('quickview:afterShow', function () {
            initQuickviewPowerReviews('#quickViewModal');
        });
    });
};

// Redeclare only so that it pulls in the overlay version (which in most cases will use the SFRA version anyways)
quickView.colorAttribute = base.colorAttribute;
quickView.removeBonusProduct = base.removeBonusProduct;
// quickView.selectBonusProduct = base.selectBonusProduct;
quickView.enableBonusProductSelection = base.enableBonusProductSelection;
quickView.showMoreBonusProducts = base.showMoreBonusProducts;
quickView.addBonusProductsToCart = base.addBonusProductsToCart;
quickView.availability = base.availability;
quickView.addToCart = base.addToCart;

/**
 * selectAttribute is also being loaded in the cart.
 * Since the cart is everywhere, it means that anytime quickView.selectAttribute is run, base.selectAttribute is run a total of at least twice
 * Since selectAttribute loads an event listener, that means multiple listeners where we only want one.
 */
if (quickView.selectAttribute) {
    delete quickView.selectAttribute;
    quickView.methods.selectAttribute = base.selectAttribute;
}

module.exports = quickView;
