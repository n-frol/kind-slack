'use strict';

var cart = require('../cart/cart');
var baseCart = require('base/cart/cart');
var processInclude = require('base/util');

/**
 *  SFRA upgrade note:
 *  This file SFRA 3.xx version. New version 5.10 is not compatible with current design.
 *  No override core file only pulsing the base cart components to support compatibility.
 */
module.exports = function () {
    if (screen.width < 440) {
        $('.minicart .popover').remove();
    }
    window.miniCartTimeout = null;

    baseCart(); // Pulls in SFRA version of cart
    cart.init();
    cart.cartScripts();

    $('.minicart').on('count:update', function (event, count) {
        if (count && $.isNumeric(count.quantityTotal)) {
            $('.minicart .minicart-quantity').text(count.quantityTotal);
            $('.minicart .js-minicart-link').toggleClass('is-filled', count.quantityTotal > 0);
        }
    });

    $('.minicart').on('mouseenter focusin touchstart', function () {
        if ($('.search:visible').length === 0) {
            return;
        }
        var url = $('.minicart').data('action-url');
        var count = parseInt($('.minicart .minicart-quantity').text(), 10);

        if (count !== 0 && $('.minicart .popover.show').length === 0) {
            $('.minicart .popover').addClass('show');
            $('.minicart .popover').spinner().start();
            $.get(url, function (data) {
                $('.minicart .popover').empty();
                $('.minicart .popover').append(data);
                $.spinner().stop();
            });
        }
    });

    $('body').on('touchstart click', function (e) {
        if ($('.minicart').has(e.target).length <= 0) {
            $('.minicart .popover').empty();
            $('.minicart .popover').removeClass('show');
        }
    });

    $('.minicart').on('mouseleave focusout', function (event) {
        if ((event.type === 'focusout' && $('.minicart').has(event.target).length > 0)
            || (event.type === 'mouseleave' && $(event.target).is('.minicart .quantity'))
            || $('body').hasClass('modal-open')) {
            event.stopPropagation();
            return;
        }
        $('.minicart .popover').empty();
        $('.minicart .popover').removeClass('show');
    });
    $('body').on('change', '.minicart .quantity', function () {
        if ($(this).parents('.bonus-product-line-item').length && $('.cart-page').length) {
            location.reload();
        }
    });

    // Remove timeouts when directly interacting with minicart
    // Prevents the timeouts from making the minicart feel unintuitive
    $('.minicart').on('mouseenter focusin touchstart', function () {
        if (window.miniCartTimeout) {
            clearTimeout(window.miniCartTimeout);
        }
    });
    $('.minicart').on('mouseleave focusout', function () {
        if (window.miniCartTimeout) {
            clearTimeout(window.miniCartTimeout);
        }
    });


    $('body')
        .on('click', '.js-minicart-close', function () {
            $(this).closest('.minicart').trigger('mouseleave');
        })
        .on('cart:update', function () {
            var miniCartQty = parseInt($('.minicart-quantity').html(), 10);
            $('.minicart .js-minicart-link').toggleClass('is-filled', !isNaN(miniCartQty) && miniCartQty > 0);
        });

    processInclude(require('int_ordergroove/product/ordergroove-qv'));
};
