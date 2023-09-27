/* global dataLayer */
'use strict';

var imageCarousel = require('../product/imageCarousel');
var quickViewHelpers = require('../product/quickViewHelpers');
var base = require('../product/base');

/**
 * Custom modal functionality to override the base modal, since SFRA doesn't have a great way to overlay it
 */
$(document).ready(function () {
    if ((window.swapEnabled != "null" && window.swapEnabled !== false && window.swapEnabled != "false" //eslint-disable-line
        && !sessionStorage.getItem("byobmodalshown") && window.location.href.indexOf("cart") > -1) //eslint-disable-line
    ) {
        sessionStorage.setItem("byobmodalshown", true);
        $('.canopenmodal').show();
    }
    setTimeout(function () {
        if ($(".apple-pay-cart").is(":hidden")) {
            $(".doublebutton1").css("width", "100%");
        } else {
            $(".doublebutton1").css("width", "49.4%");
            $(".doublebutton2").css("width", "49.4%");
            $(".doublebutton1").css("padding", "0px 0px 0px 0.625em");
            $(".doublebutton2").css("padding", "0.625em 0.625em 0px 0px");
        }
    }, 500);

    $(".promo-code-submit button").click(function () {
        $("#couponCode").val($.trim($("#couponCode").val()));
    });
    if (window.location.pathname === "/cart") {
        $(".yotpopromo").hide();
    }
    $('body').on('change',
        '.cart-page .og-type-CartRadioWidget .og-radio-cont input',
        function (e) {
            if ((window.swapEnabled != "null" && window.swapEnabled != false && window.swapEnabled != "false") && //eslint-disable-line
                $(this).hasClass("og-on-radio") && ($(this).attr("class").indexOf("27858") > -1 || $(this).attr("class").indexOf("27857") > -1)) {
                $('#byob-list-confirmation-modal-cart').show();
                $(".page").append('<div class="modal-backdrop fade show"></div>');
                window.stop();
            } else {
                window.location.reload(false);
            }
        }
    );
    $('#byob-list-confirmation-modal-cart .close').on("click", function () {
        window.location.reload(false);
    });
    $(".js-cart-confirm-close").click(function () {
        $('#byob-list-confirmation-modal-cart').hide();
    });
    $(".js-byob-list-modal .close").click(function () {
        $('#byob-list-confirmation-modal-cart').hide();
        $(".modal-backdrop").remove();
    });
});

/**
 * Generates the modal window on the first call.
 *
 */

function getCustomModalHtmlElement() {
    var htmlString = '<!-- Modal -->'
        + '<div class="modal-dialog quick-view-dialog st-modal-quickview__dialog st-modal__dialog">'
        + '<!-- Modal content-->'
        + '<div class="modal-content st-modal-quickview__content st-modal__content">'
        + '<div class="modal-header st-modal-quickview__header st-modal__header justify-content-end">'
        + '    <button type="button" class="close pull-right st-modal-quickview__header__close st-modal__close" data-dismiss="modal" aria-label="Close">'
        + '    </button>'
        + '</div>'
        + '<div class="modal-body st-modal-quickview__body st-modal__body"></div>'
        + '<div class="modal-footer st-modal-quickview__footer st-modal__footer"></div>'
        + '</div>'
        + '</div>';
    $('#editProductModal').addClass('st-modal-quickview"').html(htmlString);
}

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
 * @param {string} editProductUrl - url to be used to retrieve a new product model
 */
function fillCustomModalElement(editProductUrl) {
    $('#editProductModal .modal-body').spinner().start();
    $.ajax({
        url: editProductUrl,
        method: 'GET',
        dataType: 'html',
        success: function (html) {
            var parsedHtml = parseHtml(html);

            $('#editProductModal .modal-body').empty();
            $('#editProductModal .modal-body').html(parsedHtml.body);
            $('#editProductModal .modal-footer').html(parsedHtml.footer);

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

            $.spinner().stop();

            quickViewHelpers.quickviewImageSlider();
        },
        error: function () {
            $.spinner().stop();
        }
    });
}

/**
 * Re-does the cart product modal
 * Because there are no hooks on the cart's modal functionality and the functions are all private, we can't overlay
 * The entire framework of the modal needs to be re-done, so we'll just run it again with custom functionality
 * @param {Object} e - Event object
 */
function cartProductModalOverride(e) {
    const $target = $(e.target);

    if ($('.veil').length) {
        setTimeout(cartProductModalOverride, 100, e);
        return;
    }

    var editProductUrl = $target.attr('href');
    var qty = $target.closest('.js-cart-item').find('.js-cart-quantity-select').val() || 1;
    editProductUrl += '&quantity=' + qty;
    getCustomModalHtmlElement();
    fillCustomModalElement(editProductUrl);

    return;
}

function reOrder() {
    $('body')
        .on('click', '.js-reorder', function () {
            base.methods.doAddMultipleToCart.apply($(this), [() => {
                var $orderItems = $(this).closest('.js-order-items');
                var forwardUrl = $orderItems.find('.js-forward-url').val();

                if (forwardUrl) {
                    window.location = forwardUrl;
                }
            }]);
        });
}

/**
 * Checks the current maximum value of the corresponding quantity selector to make sure it can display the user selected value
 *
 * @param {HTML} details - HTML object corresponding to the current product details block
 */
function updateSelectorMaxQty(details) {
    var selectedQuantity = $(details).closest('.cart-and-ipay').find('.update-cart-url').data('selected-quantity');
    var uuid = $(details).closest('.cart-and-ipay').find('.update-cart-url').data('uuid');
    var $qtySelector = $('.quantity[data-uuid="' + uuid + '"]');
    var curSelectMax = parseInt($qtySelector.data('max'), 10);

    if (selectedQuantity > curSelectMax) {
        var $optionToClone = $qtySelector.find('option').last();

        for (var i = curSelectMax + 1; i <= selectedQuantity; i++) {
            $qtySelector.append($optionToClone.clone().val(i).html(i));
        }

        $qtySelector.data('max', selectedQuantity);
    }
}

/**
 * Custom functionality to add to the listener for .update-cart-product-global
 */
function updateCartProductGlobal() {
    $('body')
        .on('click', '.update-cart-product-global', function (e) {
            updateSelectorMaxQty(this);
        });
}

function refreshAfterAddProduct() {
    $('body').on('product:afterAddToCart', function (e, data) {
        if (!data.error) {
            window.location.reload();
        }
    });
}

function attachGtmRemoveCartEvents() {
    $('body').on('cart:afterCartDeleteConfirmation', function (e, data) {
        if (data.gtmRemovedItems) {
            var len = data.gtmRemovedItems.length;
            var removedProducts = [];

            for (let i = 0; i < len; i++) {
                var pli = data.gtmRemovedItems[i].item;

                removedProducts.push({
                    name: pli.productName,
                    id: pli.id,
                    price: pli.price.sales.decimalPrice,
                    brand: pli.brand,
                    variant: data.gtmRemovedItems[i].variant,
                    quantity: pli.quantity,
                    category: pli.gtmCategory,
                    dimension15: pli.isSnacksClubItem,
                    dimension16: data.gtmRemovedItems[i].subscriptionFrequency,
                    dimension17: data.gtmRemovedItems[i].byobGmBoxSize,
                    dimension18: data.gtmRemovedItems[i].badge,
                    dimension19: data.gtmRemovedItems[i].flavour,
                    dimension20: data.gtmRemovedItems[i].byobGmBoxName
                });
            }
            dataLayer.push({
                event: 'removeFromCart',
                ecommerce: {
                    remove: {
                        products: removedProducts
                    }
                }
            });
        }
    });
}

module.exports = {
    methods: {
        cartProductModalOverride: cartProductModalOverride,
        refreshAfterAddProduct: refreshAfterAddProduct,
        reOrder: reOrder,
        updateCartProductGlobal: updateCartProductGlobal,
        attachGtmRemoveCartEvents: attachGtmRemoveCartEvents
    },
    init() {
        base.customHandleVariantResponse();

        $('body').on('click', '.cart-page .product-edit .edit, .cart-page .bundle-edit .edit', cartProductModalOverride);
        reOrder();

        attachGtmRemoveCartEvents();
        // Try to use the exported, overrideable versions first
        if (this.methods) {
            this.methods.updateCartProductGlobal();
        } else {
            updateCartProductGlobal();
        }
        setTimeout(function () {
            imageCarousel.init();
        }, 700);
    },
    // Methods to run on the actual cart page
    cartScripts() {
        if ($('.js-cart').length) {
            refreshAfterAddProduct();
        }
    }
};
