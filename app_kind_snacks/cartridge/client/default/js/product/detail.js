'use strict';
var base = require('./base');
var baseDetail = require('base/product/detail');
var imageCarousel = require('./imageCarousel');

var detail = Object.assign({}, baseDetail);

detail.availability = base.availability;
detail.addToCart = base.addToCart;
detail.baseInit = base.init;
detail.imageCarouselInit = function () {
    $('.js-slider.slick-initialized').slick('unslick');
    imageCarousel.init();
};

detail.sizeChart = function () {
    baseDetail.sizeChart();

    var $sizeChart = $('.size-chart-collapsible');
    $('.size-chart a').on('click', function (e) {
        e.preventDefault();
        $sizeChart.closest('.js-product-variation-attribute').toggleClass('is-active');
    });
};
detail.updateAvailability = function () {
    baseDetail.updateAvailability();

    $('body').on('product:updateAvailability', function (e, response) {
        if (!(!response.product.readyToOrder || response.product.outOfStock)) {
            $('.availability-msg', response.$productContainer).empty();
        }
    });
};
// FR Updates for UGC Refresh issue
detail.updateYotpoUGC = function () {
    // eslint-disable-next-line
    var myInterval = setInterval(refreshYotpo, 300);
    function refreshYotpo() {
        // eslint-disable-next-line
        var state = yotpo.getState();
        // eslint-disable-next-line
        if (state == 'ready') {
            Array.from(document.getElementsByClassName("yotpo-image")).forEach(function (image) {
                if (image.hasAttribute("data-src")) {
                    image.setAttribute("src", image.getAttribute("data-src"));
                }
            });
            clearInterval(myInterval);
        }
    }
};
detail.initializeByobProduct = base.initializeByobProduct;
module.exports = detail;
