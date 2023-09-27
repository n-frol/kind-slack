'use strict';

// Legacy code pulled in from the old KIND site and adapted to fit within SFRA

module.exports = {
    sticky() {
        jQuery(document).ready(function ($) {
            function myfunction(kidsnavbar, sticky) {
                if ($(window).width() < 900) {
                    kidsnavbar.classList.remove("sticky");
                } else if (window.pageYOffset >= sticky) {
                    kidsnavbar.classList.add("sticky");
                } else {
                    kidsnavbar.classList.remove("sticky");
                }
            }

            var kidsnavbar = document.getElementById("kidsnavbar");

            if (kidsnavbar) {
                var sticky = kidsnavbar.offsetTop;

                window.onscroll = function () {
                    myfunction(kidsnavbar, sticky);
                };
            }
        });
    },
    modal() {
        var modal = document.querySelector(".kidsmodal");
        var trigger = document.querySelector(".trigger");

        var modaltwo = document.querySelector(".kidsmodaltwo");
        var triggertwo = document.querySelector(".triggertwo");


        var closeButton = document.querySelector(".close-button-kids");
        var closeButtontwo = document.querySelector(".close-button-kids-two");

        function toggleModal() {
            modal.classList.toggle("show-modal");
        }

        function toggleModaltwo() {
            modaltwo.classList.toggle("show-modal-two");
        }

        function windowOnClick(event) {
            if (event.target === modal) {
                toggleModal();
            }

            if (event.target === modaltwo) {
                toggleModaltwo();
            }
        }

        if (trigger) {
            trigger.addEventListener("click", toggleModal);
        }
        if (triggertwo) {
            triggertwo.addEventListener("click", toggleModaltwo);
        }
        if (closeButton) {
            closeButton.addEventListener("click", toggleModal);
        }
        if (closeButtontwo) {
            closeButtontwo.addEventListener("click", toggleModaltwo);
        }

        window.addEventListener("click", windowOnClick);
    },
    bioWrapToggle() {
        jQuery(document).ready(function ($) {
            $("#essay_bio_wrap_toggle").click(function () {
                $("#essay_bio_wrap").slideToggle("fast");

                if ($(".expand-symbol").text() === "+") {
                    $(".expand-symbol").text("-");
                } else {
                    $(".expand-symbol").text("+");
                }
            });
        });
    },
    productsPageScripts() { /* eslint-disable */
        jQuery(document).ready(function ($){
            if (!$('.rotating-slider').length) {
                return;
            }

            $('.rotating-slider ul.slides').removeClass('not-loaded');

            var $abcenter = $(".Absolute-Center");
            $('body').css('overflow-x', 'hidden');

            if ($(window).width() < 850) {
                $('.Absolute-Center').css('display', 'block');
            }
            setTimeout(function () {
                $abcenter.hide();
            }, 4000);

            //rotating-slider.js
            (function ($) {
                $.fn.rotatingSlider = function (options) {
                    var rotatingSlider = {
                        init: function (el) {
                            this.$slider = $(el);
                            this.$slidesContainer = this.$slider.children("ul.slides");
                            this.$slides = this.$slidesContainer.children("li");
                            this.$clipPath;
                            this.$directionControls;
                            this.$currentSlide;
                            this.$nextSlide;
                            this.$previousSlide;
                            this.settings = $.extend(
                                {
                                    autoRotate: false,
                                    autoRotateInterval: 6000,
                                    draggable: !0,
                                    directionControls: !0,
                                    rotationSpeed: 750,
                                    slideHeight: 360,
                                    slideWidth: 480,
                                    beforeRotationStart: function () {},
                                    afterRotationStart: function () {},
                                    beforeRotationEnd: function () {},
                                    afterRotationEnd: function () {}
                                },
                                options
                            );
                            this.slideAngle = 360 / this.$slides.length;
                            this.currentRotationAngle = 0;
                            this.autoRotateIntervalId = !1;
                            this.rotateTimoutId = !1;
                            this.currentlyRotating = !1;
                            this.readyToDrag = !1;
                            this.dragStartPoint;
                            this.dragStartAngle;
                            this.currentlyDragging = !1;
                            this.markupIsValid = !1;
                            this.validateMarkup();
                            if (this.markupIsValid) {
                                this.renderSlider();
                                this.setCurrentSlide();
                                this.bindEvents();
                                if (this.settings.autoRotate) {
                                    this.startAutoRotate();
                                }
                            }
                        },
                        bindEvents: function () {
                            if (this.settings.draggable) {
                                this.$slidesContainer.on(
                                    "mousedown touchstart",
                                    this.handleDragStart.bind(this)
                                );
                                this.$slidesContainer.on(
                                    "mousemove touchmove",
                                    this.handleDragMove.bind(this)
                                );
                                this.$slidesContainer.on(
                                    "mouseup mouseleave touchend",
                                    this.handleDragEnd.bind(this)
                                );
                            }
                            if (this.settings.directionControls) {
                                this.$slider
                                    .find("ul.direction-controls .left-arrow button")
                                    .click(this.handleLeftDirectionClick.bind(this));
                                this.$slider
                                    .find("ul.direction-controls .right-arrow button")
                                    .click(this.handleRightDirectionClick.bind(this));
                            }
                        },
                        handleDragStart: function (e) {
                            this.readyToDrag = !0;
                            this.dragStartPoint =
                                e.type === "mousedown" ? e.pageX : e.originalEvent.touches[0].pageX;
                        },
                        handleDragMove: function (e) {
                            if (this.readyToDrag) {
                                var pageX =
                                    e.type === "mousemove" ? e.pageX : e.originalEvent.touches[0].pageX;
                                if (
                                    this.currentlyDragging === !1 &&
                                    this.currentlyRotating === !1 &&
                                    (this.dragStartPoint - pageX > 10 ||
                                        this.dragStartPoint - pageX < -10)
                                ) {
                                    this.stopAutoRotate();
                                    if (this.settings.directionControls) {
                                        this.$directionControls.css("pointer-events", "none");
                                    }
                                    window.getSelection().removeAllRanges();
                                    this.currentlyDragging = !0;
                                    this.dragStartAngle = this.currentRotationAngle;
                                }
                                if (this.currentlyDragging) {
                                    this.currentRotationAngle =
                                        this.dragStartAngle -
                                        (this.dragStartPoint - pageX) /
                                        this.settings.slideWidth *
                                        this.slideAngle;
                                    this.$slidesContainer.css(
                                        "transform",
                                        "translateX(-50%) rotate(" + this.currentRotationAngle + "deg)"
                                    );
                                }
                            }
                        },
                        handleDragEnd: function (e) {
                            this.readyToDrag = !1;
                            if (this.currentlyDragging) {
                                this.currentlyDragging = !1;
                                this.currentRotationAngle =
                                    Math.round(this.currentRotationAngle / this.slideAngle) *
                                    this.slideAngle;
                                this.rotate();
                                if (this.settings.directionControls) {
                                    this.$directionControls.css("pointer-events", "");
                                }
                            }
                        },
                        handleLeftDirectionClick: function (e) {
                            e.preventDefault();
                            this.stopAutoRotate();
                            this.rotateClockwise();
                        },
                        handleRightDirectionClick: function (e) {
                            e.preventDefault();
                            this.stopAutoRotate();
                            this.rotateCounterClockwise();
                        },
                        renderSlider: function () {
                            var halfAngleRadian = this.slideAngle / 2 * Math.PI / 180;
                            var innerRadius =
                                1 / Math.tan(halfAngleRadian) * this.settings.slideWidth / 2;
                            var outerRadius = Math.sqrt(
                                Math.pow(innerRadius + this.settings.slideHeight, 2) +
                                Math.pow(this.settings.slideWidth / 2, 2)
                            );
                            var upperArcHeight =
                                outerRadius - (innerRadius + this.settings.slideHeight);
                            var lowerArcHeight = innerRadius - innerRadius * Math.cos(halfAngleRadian);
                            var slideFullWidth = Math.sin(halfAngleRadian) * outerRadius * 2;
                            var slideFullHeight =
                                upperArcHeight + this.settings.slideHeight + lowerArcHeight;
                            var slideSidePadding = (slideFullWidth - this.settings.slideWidth) / 2;
                            var fullArcHeight =
                                outerRadius - outerRadius * Math.cos(halfAngleRadian);
                            var lowerArcOffset =
                                (slideFullWidth - Math.sin(halfAngleRadian) * innerRadius * 2) / 2;
                            this.$slider.css("height", this.settings.slideHeight + "px");
                            this.$slider.css("width", this.settings.slideWidth + "px");
                            this.$slidesContainer.css("height", outerRadius * 2 + "px");
                            this.$slidesContainer.css("width", outerRadius * 2 + "px");
                            this.$slidesContainer.css("transform", "translateX(-50%)");
                            this.$slidesContainer.css("top", "-" + upperArcHeight + "px");
                            var pathCoords = "M 0 " + fullArcHeight;
                            pathCoords +=
                                " A " +
                                outerRadius +
                                " " +
                                outerRadius +
                                " 0 0 1 " +
                                slideFullWidth +
                                " " +
                                fullArcHeight;
                            pathCoords +=
                                " L " + (slideFullWidth - lowerArcOffset) + " " + slideFullHeight;
                            pathCoords +=
                                " A " +
                                innerRadius +
                                " " +
                                innerRadius +
                                " 0 0 0 " +
                                lowerArcOffset +
                                " " +
                                slideFullHeight +
                                " Z";
                            this.$slider.append(
                                '<svg><defs><clipPath id="slideClipPath"><path /></clipPath></defs></svg>'
                            );
                            this.$slider.find("#slideClipPath>path").attr("d", pathCoords);
                            this.$slides.each(
                                function (i, el) {
                                    var $slide = $(el);
                                    $slide.css(
                                        "transform-origin",
                                        "center " + (innerRadius + this.settings.slideHeight) + "px"
                                    );
                                    $slide.css("height", this.settings.slideHeight + "px");
                                    $slide.css("width", this.settings.slideWidth + "px");
                                    $slide.css(
                                        "padding",
                                        upperArcHeight +
                                        "px " +
                                        slideSidePadding +
                                        "px " +
                                        lowerArcHeight +
                                        "px " +
                                        slideSidePadding +
                                        "px "
                                    );
                                    $slide.css("top", upperArcHeight + "px");
                                    $slide.css(
                                        "transform",
                                        "translateX(-50%) rotate(" +
                                        this.slideAngle * i +
                                        "deg) translateY(-" +
                                        upperArcHeight +
                                        "px)"
                                    );

                                    /*** Jimmy Temporary Removed Clip Path ***/

                                    $slide.css("-webkit-clip-path", "url()");
                                    $slide.css("clip-path", "url()");
                                }.bind(this)
                            );
                            if (this.settings.directionControls) {
                                var directionArrowsHTML = '<ul class="direction-controls">';
                                directionArrowsHTML +=
                                    '<li class="left-arrow"><button>' +

                                    "</button></li>";
                                directionArrowsHTML +=
                                    '<li class="right-arrow"><button>' +

                                    "</button></li>";
                                directionArrowsHTML += "</ul>";
                                this.$slider.append(directionArrowsHTML);
                                this.$directionControls = this.$slider.find("ul.direction-controls");
                            }
                        },
                        rotateClockwise: function () {
                            this.currentRotationAngle = this.currentRotationAngle + this.slideAngle;
                            this.rotate();
                        },
                        rotateCounterClockwise: function () {
                            this.currentRotationAngle = this.currentRotationAngle - this.slideAngle;
                            this.rotate();
                        },
                        rotate: function () {
                            this.beforeRotationStart();
                            this.currentlyRotating = !0;
                            this.$slider.addClass("currently-rotating");
                            this.setCurrentSlide();
                            if (this.rotateTimeoutId) {
                                clearTimeout(this.rotateTimeoutId);
                                this.rotateTimeoutId = !1;
                            }
                            this.$slidesContainer.css(
                                "transition",
                                "transform " + this.settings.rotationSpeed / 1000 + "s ease-in-out"
                            );
                            this.$slidesContainer.css(
                                "transform",
                                "translateX(-50%) rotate(" + this.currentRotationAngle + "deg)"
                            );
                            this.afterRotationStart();
                            this.rotateTimeoutId = setTimeout(
                                function () {
                                    this.beforeRotationEnd();
                                    this.currentlyRotating = !1;
                                    this.$slider.removeClass("currently-rotating");
                                    this.$slidesContainer.css("transition", "none");
                                    if (
                                        this.currentRotationAngle >= 360 ||
                                        this.currentRotationAngle <= -360
                                    ) {
                                        this.currentRotationAngle =
                                            this.currentRotationAngle >= 360
                                                ? this.currentRotationAngle - 360
                                                : this.currentRotationAngle + 360;
                                        this.$slidesContainer.css(
                                            "transform",
                                            "translateX(-50%) rotate(" + this.currentRotationAngle + "deg)"
                                        );
                                    }
                                    this.afterRotationEnd();
                                }.bind(this),
                                this.settings.rotationSpeed
                            );
                        },
                        setCurrentSlide: function () {
                            var currAngle = this.currentRotationAngle;
                            if (
                                this.currentRotationAngle >= 360 ||
                                this.currentRotationAngle <= -360
                            ) {
                                currAngle = currAngle >= 360 ? currAngle - 360 : currAngle + 360;
                            }
                            this.$currentSlide = this.$slides.eq(-currAngle / this.slideAngle);
                            this.$nextSlide = this.$currentSlide.is(":last-child")
                                ? this.$slides.first()
                                : this.$currentSlide.next();
                            this.$previousSlide = this.$currentSlide.is(":first-child")
                                ? this.$slides.last()
                                : this.$currentSlide.prev();
                            this.$slides.removeClass("active-slide");
                            this.$slides.removeClass("next-slide");
                            this.$slides.removeClass("previous-slide");
                            this.$currentSlide.addClass("active-slide");
                            this.$nextSlide.addClass("next-slide");
                            this.$previousSlide.addClass("previous-slide");
                        },
                        startAutoRotate: function () {
                            this.autoRotateIntervalId = setInterval(
                                function () {
                                    this.rotateCounterClockwise();
                                }.bind(this),
                                this.settings.autoRotateInterval
                            );
                        },
                        stopAutoRotate: function () {
                            if (this.autoRotateIntervalId) {
                                clearInterval(this.autoRotateIntervalId);
                                this.autoRotateIntervalId = !1;
                            }
                        },
                        validateMarkup: function () {
                            if (
                                this.$slider.hasClass("rotating-slider") &&
                                this.$slidesContainer.length === 1 &&
                                this.$slides.length >= 2
                            ) {
                                this.markupIsValid = !0;
                            } else {
                                this.$slider.css("display", "none");
                                console.log("Markup for Rotating Slider is invalid.");
                            }
                        },
                        beforeRotationStart: function () {
                            this.settings.beforeRotationStart();
                        },
                        afterRotationStart: function () {
                            this.settings.afterRotationStart();
                        },
                        beforeRotationEnd: function () {
                            this.settings.beforeRotationEnd();
                        },
                        afterRotationEnd: function () {
                            this.settings.afterRotationEnd();
                        }
                    };
                    return this.each(function () {
                        rotatingSlider.init(this);
                    });
                };
            })(jQuery);

            $(function () {
                $(".rotating-slider").rotatingSlider({
                    slideHeight: 360,
                    slideWidth: 420,
                    rotationSpeed: 200,
                    afterRotationStart: function () {
                        if (jQuery('.active-slide .group-product-core').length > 0) {

                            $('.kind-nut-bars').css('display','block');
                        } else {
                            $('.kind-nut-bars').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-butter').length > 0) {

                            $('.kind-butter-bars').css('display','block');
                        } else {
                            $('.kind-butter-bars').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-hgb').length > 0) {

                            $('.hgb').css('display','block');
                        } else {
                            $('.hgb').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-kids').length > 0) {

                            $('.kids').css('display','block');
                        } else {
                            $('.kids').css('display','none');
                        }


                        if (jQuery('.active-slide .group-product-breakfast').length > 0) {

                            $('.breakf').css('display','block');
                        } else {
                            $('.breakf').css('display','none');
                        }


                        if (jQuery('.active-slide .group-product-bags').length > 0) {

                            $('.cluster').css('display','block');
                        } else {
                            $('.cluster').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-fruit-bites').length > 0) {

                            $('.fruitbite').css('display','block');
                        } else {
                            $('.fruitbite').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-mini').length > 0) {

                            $('.mini').css('display','block');
                        } else {
                            $('.mini').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-pressed').length > 0) {

                            $('.pressed').css('display','block');
                        } else {
                            $('.pressed').css('display','none');
                        }


                        if (jQuery('.active-slide .group-product-ss').length > 0) {

                            $('.ssbars').css('display','block');
                        } else {
                            $('.ssbars').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-protein').length > 0) {

                            $('.protein').css('display','block');
                        } else {
                            $('.protein').css('display','none');
                        }

                    },

                    beforeRotationStart: function () {

                        if (jQuery('.active-slide .group-product-core').length > 0) {

                            $('.kind-nut-bars').css('display','block');
                        } else {
                            $('.kind-nut-bars').css('display','none');
                        }

                       if (jQuery('.active-slide .group-product-hgb').length > 0) {

                            $('.hgb').css('display','block');
                        } else {
                            $('.hgb').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-kids').length > 0) {

                            $('.kids').css('display','block');
                        } else {
                            $('.kids').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-breakfast').length > 0) {

                            $('.breakf').css('display','block');
                        } else {
                            $('.breakf').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-bags').length > 0) {

                            $('.cluster').css('display','block');
                        } else {
                            $('.cluster').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-fruit-bites').length > 0) {

                            $('.fruitbite').css('display','block');
                        } else {
                            $('.fruitbite').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-mini').length > 0) {

                            $('.mini').css('display','block');
                        } else {
                            $('.mini').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-pressed').length > 0) {

                            $('.pressed').css('display','block');
                        } else {
                            $('.pressed').css('display','none');
                        }

                        if (jQuery('.active-slide .group-product-ss').length > 0) {

                            $('.ssbars').css('display','block');
                        } else {
                            $('.ssbars').css('display','none');
                        }

                    }
                });
            });
        });
    }
};
