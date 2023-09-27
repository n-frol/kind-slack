/* eslint-disable no-shadow */
/* eslint-disable no-console */
'use strict';

module.exports = {
    init: function () {
        function applySliderClasses(slider) {
            if (slider.data('slickarrows')) {
                slider.find('.slick-arrow').addClass(slider.data('slickarrows'));
            }
            var dots = slider.find('.slick-dots');
            if (dots.is('*')) {
                slider.find('.slick-dots').addClass(slider.data('slickdots'));
            }
        }
        function initiateSlider(slider) {
            var slickArgs = slider.data('slick');
            slider.on('init', function (event, slick, direction) {
                applySliderClasses(slider);
            }).on('breakpoint', function (event, slick, direction) {
                applySliderClasses(slider);
            }).slick(slickArgs);
        }
        setTimeout(function () {
            if ($('.js-recommendation-customized').is('*')) {
                var slider = $('.js-recommendation-customized');
                if (!slider || slider.hasClass('slick-initialized')) return;
                initiateSlider(slider);
            }
        }, 3000);
    }
};
