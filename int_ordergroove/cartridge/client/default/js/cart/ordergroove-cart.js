'use strict';

var impulseUpsellIds = [
    '6b6943d6d92f11e88428bc764e106cf4',
    '89f9a6f8092a11e9ba79bc764e101db1'
];

function removeFromCart() {
    $('body').on('click', '.cart-delete-confirmation-btn', function () {
        if (window.OG && window.OG.removeFromCart) {
            window.OG.removeFromCart({
                id: $(this).data('pid')
            }, { isAjax: true });
        }
    });
}

function updateFrequencyFromCartPageAjax(url, frequency, reload) {
    $.spinner().start();
    $.ajax({
        url: url,
        method: "GET",
        data: {
            freq: frequency
        },
        success: function () {
            $.spinner().stop();
            if (reload) {
                location.reload();
            }
        },
        error: function () {
            $.spinner().stop();
        },
    });
}


function sendCartActionToOG(e, data) {
    if (!$(".byob-page").length) {
        return;
    }
    const atcGlobalWrap = $('.js-add-to-cart-bg');
    const ogBoxSku = atcGlobalWrap.attr('data-og-box-sku');

    setTimeout(function() {
        if (window.OG.updateCart && $(".js-update-list-byob").length) {
            console.log('update cart', {
                id: ogBoxSku,
                module: "pdp_nocontent",
                quantity: 1
            });
            window.OG.updateCart({
                id: ogBoxSku,
                module: "pdp_nocontent",
                quantity: 1
            });
            return;
        }
        if (window.OG.addToCart) {
            console.log('add to cart', {
                id: ogBoxSku,
                module: "pdp_nocontent",
                quantity: 1
            });
            window.OG.addToCart([{
                id: ogBoxSku,
                module: "pdp_nocontent",
                quantity: 1
            }]);
        }
    }, 1000);
}

/**
 * Method for OG IU toggler listener
 * Separate method so it can be targeted
 */
function doToggleImpulseUpsell() {
    const $addToCart = $('.add-to-cart');
    const $adHocOgPricing = $('.js-og-pricing--ad-hoc');
    const $ogPricing = $('.js-og-pricing');

    //$addToCart[0].toggleAttribute('disabled');
    $adHocOgPricing.toggle();
    $ogPricing.toggleClass('c-ordergroove-pricing--impulse-upsell--is-expanded');
}

module.exports = {
    methods: {
        doToggleImpulseUpsell: doToggleImpulseUpsell
    },

    removeFromCart: removeFromCart(),

    updateCart: function () {
        $('body').on('change', '.quantity-form .quantity', function () {
            if (window.OG && window.OG.updateCart) {
                window.OG.updateCart({
                    id: $(this).data('pid'),
                    module: $('.og-offer').data('og-module'),
                    quantity: $(this).val()
                });
            }
            removeFromCart();
        });
    },

    setPricing: function () {
        $('.og-offer').ready(function () {
            if (window.OG && window.OG.listen) {
                window.OG.listen('offerLoaded', function (data) {
                    if (data.offerInfo.module === 'qv' || data.offerInfo.module === 'qv_snackpack') {
                        const offerId = data.offerInfo ? data.offerInfo.offerId : '';
                        const isImpulseUpsell = impulseUpsellIds.indexOf(offerId) > -1;

                        // Remove stylistic line break
                        $('span.og-sale-price').find('br').remove();

                        if (isImpulseUpsell) {
                            $('.product-quickview .js-og-pricing .js-og-pricing__ad-hoc').empty(); // Prevent duplication
                            $('.product-quickview .js-og-pricing').addClass('c-ordergroove-pricing--impulse-upsell');
                            $('.product-quickview .js-add-to-cart').addClass('c-product-add-to-cart--impulse-upsell');
                            $('.product-quickview .js-list-price--ad-hoc').appendTo('.product-quickview .js-og-pricing--ad-hoc .js-og-pricing__ad-hoc');
                            $('.product-quickview .js-list-price--sales').appendTo('.product-quickview .js-og-pricing--ad-hoc .js-og-pricing__ad-hoc');
                            $('.product-quickview .js-list-price--ad-hoc__callout').appendTo('.product-quickview .js-og-pricing--ad-hoc .js-og-pricing__ad-hoc').removeClass('d-none');
                        } else {
                            $('.product-quickview .js-list-price--ad-hoc').appendTo('.product-quickview .js-og-pricing .js-og-pricing__ad-hoc');
                            $('.product-quickview .js-list-price--sales').appendTo('.product-quickview .js-og-pricing .js-og-pricing__ad-hoc');
                            $('.product-quickview .js-list-price--ad-hoc__callout').appendTo('.product-quickview .js-og-pricing .js-og-pricing__ad-hoc').removeClass('d-none');
                        }

                        // Promotional price
                        // $('span.strike-through').appendTo('');
                        $('.product-quickview .js-list-price--og-sale').appendTo('.product-quickview .js-og-pricing__subscription').removeClass('d-none');

                        if (isImpulseUpsell) {
                            $('.product-quickview .js-list-price--og-sale').clone().appendTo('.product-quickview .js-og-pricing .js-og-pricing__ad-hoc');
                        }

                        if ($('.product-quickview .js-list-price--snack-pack').length) {
                            $('.product-quickview .js-list-price--og-sale').addClass('strike-through');
                            $('.product-quickview .js-list-price--snack-pack').appendTo('.product-quickview .js-og-pricing__subscription');
                        }
                    }
                });
            }
        });
    },

    setProduct: function () {
        $('body').on('click', '.cart-page .product-edit .edit', function (e) {
            e.preventDefault();

            if (window.OG && window.OG.setProduct) {
                window.OG.setProduct({
                    id: $(this).parents('.product-info').find('.quantity-form .quantity').data('pid'),
                    module: 'qv',
                    quantity: 1 // $(this).parents('.product-info').find('.quantity-form .quantity').val()
                });
            }
        });
    },
    submitIu: function () {
        // Attempt to use final exported version of doToggleImpulseUpsell for the sake of extensibility
        var baseObj = this;
        var doToggleImpulseUpsellScoped = doToggleImpulseUpsell;
        if (baseObj.methods && baseObj.methods.doToggleImpulseUpsell) {
            doToggleImpulseUpsellScoped = baseObj.methods.doToggleImpulseUpsell;
        }

        // The listener attached to the button by OG strips out other listeners on click, so mouseup is the alternative
        $('body').on('mouseup', '.og-button[data-og-event=submitIU]', function () {
            $('.js-og-pricing, .js-og-pricing--ad-hoc').addClass('c-ordergroove-pricing--impulse-upsell--is-submitted');
            $('body').off('click', '.og-iu', doToggleImpulseUpsellScoped);
        });
    },
    toggleImpulseUpsell: function () {
        // Attempt to use final exported version of doToggleImpulseUpsell for the sake of extensibility
        var baseObj = this;
        var doToggleImpulseUpsellScoped = doToggleImpulseUpsell;
        if (baseObj.methods && baseObj.methods.doToggleImpulseUpsell) {
            doToggleImpulseUpsellScoped = baseObj.methods.doToggleImpulseUpsell;
        }

        $('body').on('click', '.og-iu', doToggleImpulseUpsellScoped);
    },
    setOGModuleOnPageInit: function () {
        if (!window.OG || $('.cart-page').length || !$("#product-search-results").length) {
            return;
        }

        $(".og-offer-byob").ready(function () {
            const atcGlobalWrap = $('.js-add-to-cart-bg');
            var ogEvery = atcGlobalWrap.attr('data-og-data-every');
            var ogEveryPeriod = atcGlobalWrap.attr('data-og-data-period');
            var ogBoxSku = atcGlobalWrap.attr('data-og-box-sku');
            var frequency = parseInt(ogEvery, 10).toFixed(0) + '_' + parseInt(ogEveryPeriod, 10).toFixed(0);
            var pid = $('.og-offer-byob').attr('data-og-pid');

            if (!pid) {
                return;
            }
            window.OG.setModule({
                module: "pdp_nocontent",
                products: [pid],
            });

            console.log('set module: pdp_nocontent', pid);

            if (parseInt(ogEveryPeriod, 10).toFixed(0) > 0) {
                setTimeout(function() {
                    console.log('setFrequency', 'pdp_nocontent', ogBoxSku, 'setFrequency', frequency);
                    window.OG.API('pdp_nocontent', ogBoxSku, 'setFrequency', frequency);
                }, 3000);
            }
        });
    },
    addToCartGlobalOG: function () {
        if (!window.OG) {
            return;
        }

        $("body").on('product:afterUpdateListInCart', sendCartActionToOG);
        $("body").on('product:afterAddToCart', sendCartActionToOG);
    },
    OGsubscriptionIntervalChanged: function() {
        if (!$('.cart-page').length){
            return;
        }
        var url = '';
        var frequency = '0_0';

        $('body').on('change', '.og-radio-cont input', function() {
            url = $(this).closest('.c-cart-product-info').attr('data-url');

            var $frequencySelector = $(this).closest('.og-option-row').find("[name='frequency']");
            if ($frequencySelector.length) {
                frequency = $frequencySelector.val();
            }

            updateFrequencyFromCartPageAjax(url, frequency);
        })

        $('body').on('change', "[name='frequency']", function() {
            url = $(this).closest('.c-cart-product-info').attr('data-url');
            frequency = $(this).val();
        });

        $('body').on('click', '.js-cart-confirm-close', function() {
            updateFrequencyFromCartPageAjax(url, frequency, true);
        })

    }
};
