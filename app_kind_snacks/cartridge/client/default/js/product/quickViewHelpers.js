'use strict';

// Define add-on functions to be used when generating quickviews

// Make sure the first image in the product's slider has loaded, then load Slick slider
function quickviewImageSlider() {
    // If first image exists and hasn't loaded yet, wait and try
    if ($('.js-product-primary-images__carousel__img').length && !$('.js-product-primary-images__carousel__img').width()) {
        setTimeout(quickviewImageSlider, 100);
        return;
    }

    var imageCarousel = require('./imageCarousel');
    imageCarousel.init();
    $(window).trigger('resize');
}

module.exports = {
    quickviewImageSlider: quickviewImageSlider
};
