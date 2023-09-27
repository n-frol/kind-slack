/* eslint-disable no-alert */

module.exports = {
    onScrollLogo: function () {
        $('body').scroll(function () {
            var y = $(this).scrollTop();
            if (y > 100) {
                $('.js-logo-fade').addClass('cs-small-logo', { duration: 500 });
            } else {
                $('.js-logo-fade').removeClass('cs-small-logo', { duration: 500 });
            }
        });
    },
    lockBodyOnMenuToggle: function () {
        $('body').on('click', '.js-navbar-toggler', function () {
            if ($('body').hasClass('hide-overflow')) {
                $('body').removeClass("hide-overflow");
                return;
            }
            $('body').addClass("hide-overflow");
        });
    },
    playVideo: function () {
        $('body').on('click', '#play-video-btn-js', function () {
            var ytIframe = $('#yt-video');
            var preloadContent = $('.video-component-preload');
            var videoContent = $('.video-component-content');
            preloadContent.hide();
            if (ytIframe.length) {
                ytIframe[0].src += "?autoplay=1";
                setTimeout(function () { videoContent.show(); }, 500);
            } else {
                videoContent.show();
                $('#upl-video').get(0).play();
            }
        });
    },
    updateBreadcrumbs: function () {
        $('body').on('checkout:nextStep', function () {
            var stageName = $('.data-checkout-stage').attr('data-checkout-stage');
            if (stageName === 'shipping') {
                $(".checkoutsteps").html('<a id="stepcart" class="stepprev" href="/cart">CART</a> > <a id="stepship" class="stepprev" href="checkout?stage=shipping">SHIPPING</a> > <b class="stepcurrent">PAYMENT</b>  > REVIEW');
            }
        });
    },
    showDropDown: function () {
        $(".navbar-toggler").click(function (e) {
            if ($("main-menu").hasClass("is-in")) {
                $(".js-shop-nav").removeClass("show");
            }
        });
        $('body').on('click', '.left-menu .nav-item', function () {
            $('.js-dropdown-toggle-cs').addClass('set-white-space');
        });
        $(".navbar-nav").on("click", ".back", function (e) {
            if ($('.js-dropdown-toggle-cs').hasClass('set-white-space')) {
                $('.js-dropdown-toggle-cs').removeClass('set-white-space');
            }
        });
    }
};
