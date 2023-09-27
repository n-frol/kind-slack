'use-strict';

/**
 * Indicate the widget has been intialized
 * targetDiv is for PDP and QV so it can be reused
 */
function setInitialized() {
    $('.og-offer').ready(function () {
        if (window.OG && window.OG.listen) {
            window.OG.listen('offerLoaded', function (data) {
                var targetDiv = $('.s-ordergroove:not(.s-ordergroove--initialized)');
                targetDiv.addClass('s-ordergroove--initialized');
                // Remove stylistic line break
                $('span.og-sale-price').find('br').remove();
                    var spPrice = targetDiv.find('.js-list-price--snack-pack');
                    if(targetDiv.find('.js-byob-get-started').length) {
                        var newSalePrice = spPrice.find('span').text();
                        targetDiv.find('.js-list-price--og-sale span').text(newSalePrice);
                        targetDiv.find('.js-list-price--snack-pack').addClass('d-none');
                    }
                    $('.js-snack-pack-message').removeClass('d-none');
                    if (spPrice.length) {
                        targetDiv.find('.js-list-price--og-sale').addClass('strike-through');
                        targetDiv.find('.js-list-price--snack-pack').appendTo('.js-og-pricing__subscription');
                    }
                    if (data.offerInfo.module === 'pdp' || data.offerInfo.module === 'pdp_snackpack' || data.offerInfo.module === 'qv') {
                        setTimeout(function() {
                            var isAvailable = $('.product-availability').attr('data-available') == 'true';
                            if(!isAvailable) {
                                targetDiv.addClass('is-disabled');
                                if(targetDiv.find('.og-widget input').length > 1) {
                                    targetDiv.find('.og-widget input').attr('disabled', true);
                                }
                                if(targetDiv.find('.og-iu').is('*')) {
                                    targetDiv.find('.og-iu').attr('disabled', true);
                                }
                            } else {
                                if(targetDiv.find('.og-label').length > 1) {
                                    targetDiv.find('.og-label').eq(0).trigger('click');
                                }
                            }
                        }, 500);
                    } else if( data.offerInfo.module === 'sc') {
                        setTimeout(function() {
                            var checked = targetDiv.find('input:checked');
                            checked.closest('.og-option-row').addClass('is-active');
                        }, 500);
                    }

                $('.prices').spinner().stop();
            });

        }
    });
}

function onOfferChange() {
    $('.og-offer').ready(function () {
        if (window.OG && window.OG.listen) {
            window.OG.listen('offerChange', function (fullData) {
                var data = fullData.data;
                var isQuickview = $('#quickViewModal').is(':visible');
                var targetDiv = $('.st-pdp-main__section');
                if(isQuickview) {
                    var targetDiv = $('#quickViewModal .st-product-quickview-main__section--details');
                }
                if (fullData.offerInfo && data && targetDiv.find('.js-byob-get-started').length) {
                    var frequency = data.frequency;

                    targetDiv.find('.js-byob-get-started').attr('data-og-module', 'snackbox');

                    if (frequency) {
                        targetDiv.find('.js-byob-get-started').attr('data-og-every', frequency.every)
                            .attr('data-og-every-period', frequency.everyPeriod);
                    } else {
                        targetDiv.find('.js-byob-get-started').attr('data-og-every', 0)
                            .attr('data-og-every-period', 0);
                    }
                }
                if(data.subscribed) {
                    $(".itsapromo").hide();
                    targetDiv.find('.js-list-price--sales').addClass('strike-through');
                    if (targetDiv.find('.js-list-price--snack-pack').is('*')) {
                        targetDiv.find('.js-list-price--og-sale').removeClass('strike-through').removeClass('d-none');
                        targetDiv.find('.js-list-price--snack-pack').removeClass('d-none');
                    } else {
                        targetDiv.find('.js-list-price--og-sale').removeClass('strike-through');
                        targetDiv.find('.js-og-pricing__subscription, .js-list-price--og-sale').removeClass('d-none');
                    }
                }
                else {
                    $(".itsapromo").show();
                    targetDiv.find('.js-list-price--sales').removeClass('strike-through');
                    if (targetDiv.find('.js-list-price--snack-pack').is('*')) {
                        targetDiv.find('.js-list-price--snack-pack').addClass('d-none');
                        targetDiv.find('.js-list-price--og-sale').addClass('d-none');
                    } else {
                        targetDiv.find('.js-list-price--og-sale').addClass('strike-through');
                        targetDiv.find('.js-og-pricing__subscription, .js-list-price--og-sale').addClass('d-none');
                    }
                }
                targetDiv.find('.og-option-row').removeClass('is-active');
                var checkedRadio = targetDiv.find('.og-widget input:checked');
                var row = checkedRadio.closest('.og-option-row');
                row.addClass('is-active');
            });
        }
    });
}

module.exports = {
    setInitialized: setInitialized,
    onOfferChange: onOfferChange
};
