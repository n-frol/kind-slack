/* eslint-disable */
'use strict';

/**
 * Controls the slick slider for the product primary images
 */

// Slick doesn't give us a way to put the dots in between the two arrows, so manually move the next button
function moveCarouselNext($sliderControls) {
    if ($sliderControls.find('.slick-dots').length) {
        const $next = $sliderControls.find('.slick-next');
        $next.detach();
        $sliderControls.append($next);
    }
}

module.exports = {
    init() {
        const ns = 'js-slider';
        const controlsNs = `${ns}__controls`;
        var $sliders = $(`.${ns}:not(.slick-initialized)`);

        $.each($sliders, function (index, slider) {
            const hiddenClass = 'd-none';
            const $slider = $(slider);
            const isAutoplay = $slider.data('autoplay') === 'true' || $slider.data('autoplay') === true;
            const autoplaySpeed = $slider.data('autoplayspeed');
            const isArrows = $slider.data('arrows') === 'true' || $slider.data('arrows') === true;
            const isDots = $slider.data('dots') === 'true' || $slider.data('dots') === true;
            const mobileDots = $slider.data('mobiledots') === 'true' || $slider.data('mobiledots') === true;
            const isInfinite = !($slider.data('infinite') === 'false' || $slider.data('infinite') === false);
            const slidesToScroll = $slider.data('slidestoscroll') || 1;
            const slidesToScroll440 = $slider.data('slidestoscroll-440') || false;
            const slidesToScroll768 = $slider.data('slidestoscroll-768') || false;
            const slidesToScroll1024 = $slider.data('slidestoscroll-1024') || false;
            const slidesToScroll1200 = $slider.data('slidestoscroll-1200') || false;
            const slidesToShow = $slider.data('slidestoshow') || 1;
            const slidesToShow440 = $slider.data('slidestoshow-440') || false;
            const slidesToShow768 = $slider.data('slidestoshow-768') || false;
            const slidesToShow1024 = $slider.data('slidestoshow-1024') || false;
            const slidesToShow1200 = $slider.data('slidestoshow-1200') || false;
            const $controls = $slider.siblings(`.${controlsNs}`);

            let dotsClass = 'slick-dots c-product-primary-images__carousel__controls__indicators';

            if ($(slider).data('variable-color') === 'true' || $(slider).data('variable-color') === true) {
                dotsClass += ' variable-color';
            }

            // Get the arrows generated in the isml template
            const $prevArrow = $controls.find(`.${controlsNs}__prev`).clone()
                .removeClass(hiddenClass);
            const $nextArrow = $controls.find(`.${controlsNs}__next`).clone()
                .removeClass(hiddenClass);

            let slickArgs = {
                autoplay: isAutoplay,
                autoplaySpeed: autoplaySpeed,
                arrows: isArrows, // The following arrow settings won't apply if false
                infinite: isInfinite,
                nextArrow: $nextArrow[0] ? $nextArrow[0].outerHTML : '',
                prevArrow: $prevArrow[0] ? $prevArrow[0].outerHTML : '',
                appendDots: $controls,
                dots: isDots, // The following dot settings won't apply if false
                dotsClass: dotsClass,
                slidesToScroll: slidesToScroll,
                slidesToShow: slidesToShow
            };
            slickArgs.responsive = [];
            if (slidesToShow440 || slidesToScroll440) {
                var settings440 = {
                    breakpoint: 441,
                    settings: { dots: mobileDots }
                };

                if (slidesToShow440) {
                    settings440.settings.slidesToShow = slidesToShow440;
                }
                if (slidesToScroll440) {
                    settings440.settings.slidesToScroll = slidesToScroll440;
                }
                slickArgs.responsive.push(settings440);
            }

            if (slidesToShow768 || slidesToScroll768) {
                var settings768 = {
                    breakpoint: 821,
                    settings: {}
                };

                if (slidesToShow768) {
                    settings768.settings.slidesToShow = slidesToShow768;
                }
                if (slidesToScroll768) {
                    settings768.settings.slidesToScroll = slidesToScroll768;
                }

                slickArgs.responsive.push(settings768);
            }

            if (slidesToShow1024 || slidesToScroll1024) {
                slickArgs.responsive = slickArgs.responsive || [];

                var settings1024 = {
                    breakpoint: 1025,
                    settings: {}
                };

                if (slidesToShow1024) {
                    settings1024.settings.slidesToShow = slidesToShow1024;
                }
                if (slidesToScroll1024) {
                    settings1024.settings.slidesToScroll = slidesToScroll1024;
                }

                slickArgs.responsive.push(settings1024);
            }

            if (slidesToShow1200 || slidesToScroll1200) {
                slickArgs.responsive = slickArgs.responsive || [];

                var settings1200 = {
                    breakpoint: 1201,
                    settings: {}
                };

                if (slidesToShow1200) {
                    settings1200.settings.slidesToShow = slidesToShow1200;
                }
                if (slidesToScroll1024) {
                    settings1200.settings.slidesToScroll = slidesToScroll1200;
                }

                slickArgs.responsive.push(settings1200);
            }

            if ($slider.hasClass('js-recommendation-slider')) {
                slickArgs.slidesToShow = 4;
                slickArgs.slidesToScroll = 1;
                slickArgs.responsive = [
                    {
                        breakpoint: 1024,
                        settings: {
                            slidesToShow: 3,
                            slidesToScroll: 1
                        }
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1
                        }
                    }
                ];
            }

            if ($controls.hasClass(`${controlsNs}--arrows-inline`)) {
                slickArgs.appendArrows = $controls;
            }

            $(slider).slick(slickArgs);
            if ($slider.hasClass('js-recommendation-slider')) {
                // Center the slide content if there aren't enough slides for the slider to be "active"
                const $tiles = $slider.find('.js-product-tile');
                if ($tiles.length) {
                    if ($tiles.length <= 3) {
                        $slider.find('.slick-list').addClass('d-md-flex')
                            .addClass('justify-content-md-center');
                    } else if ($tiles.length <= 4) {
                        $slider.find('.slick-list').addClass('d-lg-flex')
                            .addClass('justify-content-lg-center');
                    }
                }
            }
            if ($(slider).closest('.primary-images').hasClass('js-append-thumbnails') && !$(slider).find('.thumbnail-pager').is('*')) {
                // Center the slide content if there aren't enough slides for the slider to be "active"
                const $slides = $(slider).find('.slick-slide:not(.slick-cloned)');
                if ($slides.length) {
                    $slides.each(function () {
                        if ($(this).attr('id')) {
                            var id = $(this).attr('id');
                            var indexTarget = id.split('slick-slide')[1];
                            var src = $(this).find('.carousel-item').attr('data-thumbnailsrc');
                            var altTxt = $(this).find('.carousel-item').attr('data-altText');
                            var target = $('#slick-slide-control' + indexTarget);
                            target.parent().prepend('<img class="thumbnail-pager" src="' + src + '" alt="' + altTxt + '" />');
                        }
                    });
                }
            }


            moveCarouselNext($controls);
        });
    }
};
