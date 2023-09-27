/**
 * Google Tag Manager Events
 */

'use strict';

require('intersection-observer');
var _ = require('lodash');
var $ = require('jquery');

// ensure datalayer is initialized
window.dataLayer = window.dataLayer || [];

var io;
var observedImpressions = [];
var reportedImpressions = [];

/**
 * Collect as much information regarding the product element (producttile)
 * as possible for impression and click stream data
 */
function getProductElementInfo(element) {
    var $el = $(element);
    var result = {
        'name' : $el.attr('data-itemname'),
        'id' : $el.attr('data-itemid'),
        'list' : '',
        'category' : '',
        'position' : '',
        'brand': $('body').data('brand')
    };

    // if we have a gridindex on the element or parent container
    // use that as position
    var $posEl = $el.closest('[data-gridindex]');
    var $listEl = $el.closest('[data-gridname]');
    var $catEl = $el.closest('[data-categoryname]');

    if ($posEl.length) {
        result.position = parseInt($posEl.attr('data-gridindex'), 10) + 1;
    }

    if ($listEl.length) {
        result.list = $listEl.attr('data-gridname');
    }
    if ($catEl.length) {
        result.category = $catEl.attr('data-categoryname');
    }

    if (result.list === 'PDP Recommendations') {
    	result.id = $el.attr('data-masterid');
    }

    return result;
}

/**
 * GTM Data Layer Reporter
 */
function _reporter(target, cb) {
    if (!target && observedImpressions.length === 0) {
        return;
    }

    var dataLayer = window.dataLayer;
    var _dataLayer = {
        'ecommerce' : {}
    };

    _dataLayer.event = "impressions";
    if (target) {
        var _ev = {};
        // target action event override
        _dataLayer.event = "productClick";

        var productClicked = getProductElementInfo(target);

        if (productClicked.list) {
            _ev.actionField = {
                'list' : productClicked.list
            }
        }

        _ev.products = [productClicked];

        _dataLayer.ecommerce.click = _ev;
    }

    if (observedImpressions.length > 0) {
        var impressions = _.map(observedImpressions, function(element) {
            return getProductElementInfo(element);
        });

        Array.prototype.push.apply(reportedImpressions, observedImpressions);
        observedImpressions = [];
        _dataLayer.ecommerce.impressions = impressions;
    }

    if (cb) {
        _dataLayer.eventCallback = cb;
    }

    dataLayer.push(_dataLayer);
}
var reporter = _.debounce(_reporter, 3000);


function observer(entries, io) {

    for (var i = 0; i < entries.length; i++){
        var entry = entries[i];
        if (entry.intersectionRatio <= 0)  {
            continue;
        }
        io.unobserve(entry.target);

        if (reportedImpressions.indexOf(entry.target) === -1 &&
            observedImpressions.indexOf(entry.target) === -1) {
            observedImpressions.push(entry.target);
        }
    }

    reporter();
}

/***
 * Attaches addToCart to custom event to track adds
 *
 */
function attachAddRemoveCartEvents() {
    // Add GTM event
    $('body').on('product:afterAddToCart', function (e, data) {
        var addUUID = data.pliUUID;
        var brand = $('body').data('brand');

        var products = [];
        let currencyCode = null;
        for (var i = 0; i < data.cart.items.length; i++) {
            var pli = data.cart.items[i];

            if (pli.UUID === addUUID) {
                currencyCode = currencyCode == null ? pli.price.sales.currency : null;
                let subscriptionType = 0;
                let isSnacksClubItem = pli.isSnacksClubItem;
                let badge = pli.badge;
                let flavour = pli.gmFlavour
                products.push({
                    name: pli.productName,
                    id: pli.masterId,
                    price: pli.price.sales.decimalPrice,
                    variant: pli.packSize,
                    quantity: $(".quantity-select").val(),
                    category: pli.gtmCategory,
                    brand: brand,
                    dimension15: isSnacksClubItem,
                    dimension16: subscriptionType > 0 ? subscriptionType + ' days' : null,
                    dimension17: null,
                    dimension18: badge ? badge: null,
                    dimension19: flavour ? flavour: null,
                    dimension20: null,
                });
            }
        }
        if(products.length > 0) {
            dataLayer.push({
                add_to_cart_type: 'quick shop',
                event: 'addToCart',
                ecommerce: {
                    currencyCode: currencyCode,
                    add: {
                        products: products
                    }
                }
            });
        }
    });

    $('body').on('product:afterRemoveFromCart', function (e, data) {
        if (data.removedProducts) {
            var brand = $('body').data('brand');
            var len = data.removedProducts.length;
            var removedProducts = []

            for (var i = 0; i < len; i++) {
                var pli = data.removedProducts[i];

                removedProducts.push({
                    name: pli.productName,
                    id: pli.masterId,
                    price: pli.price.sales.decimalPrice,
                    variant: pli.id,
                    quantity: pli.quantity,
                    category: pli.gtmCategory,
                    brand: brand
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

/**
 * Call to reinitialize tag manager events such as when
 * new products are loaded on the grid
 */
function reinit() {
    var i;

    // product impression observers
    var productTiles = document.querySelectorAll('.product-tile');
    for (i=0; i < productTiles.length; i++) {
        var tile = productTiles[i];
        io.observe(tile);
    }

    // product click actions
    $(productTiles).on('click', '', function(ev) {
        var href = $(ev.target).closest('.product-tile').attr('href');
        if (href) {
            if ($(ev.target).has('.quickview')) {
                _reporter(this);
            } else {
                ev.preventDefault();
                _reporter(this, function() {
                    document.location = href;
                });
            }
        }
    });
}

function init() {
    attachAddRemoveCartEvents();

    // poll for product tile impressions
    io = new IntersectionObserver(observer, {
        threshold: 0.5
    });
    io.POLL_INTERVAL = 1000;

    reinit();

    window.addEventListener('unload', function() {
        // flush immediately
        _reporter();
    });

    // Bind reinit to global event for triggering outside of this script.
    $('body').on('gtm:reinit', reinit);
}


exports.init = init;
exports.reinit = reinit;
