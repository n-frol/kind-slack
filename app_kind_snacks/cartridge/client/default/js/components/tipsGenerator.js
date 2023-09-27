'use strict';

// Add function to jquery allowing for animated rotations, if no such function already exists
if (!$.fn.animateRotate) {
    $.fn.animateRotate = function (angle, duration, easing, complete) {
        return this.each(function () {
            var $elem = $(this);

            $({ deg: 0 }).animate({ deg: angle }, {
                duration: duration,
                easing: easing,
                step: function (now) {
                    $elem.css({
                        transform: 'rotate(' + now + 'deg)'
                    });
                },
                complete: complete ? complete.bind($elem) : function () {
                }
            });
        });
    };
}

/**
 * Generates random integer number
 * @param {number} min - minimal interval value
 * @param {number} max - maximum interval value
 * @returns {number} - Generated integer number that will be between input interval
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
/**
 * Rotates images inside the generator block
 * @param {Object} icons - jQuery object to rotate
 */
function rotateIcon(icons) {
    // Rotate the images -360deg, then reset
    icons.animateRotate(-360, 300, 'linear', function () {
        $(this).css('transform', 'rotate(0deg)');
    });
}

module.exports = {
    methods: {
        getRandomInt: getRandomInt,
        rotateIcon: rotateIcon
    },
    generateCompliment() {
        $(".js-generate-compliment").on("click", function () {
            var complimentMessages = window.complimentMessages || [];
            var complimentMessage = complimentMessages[getRandomInt(0, complimentMessages.length)] || '';
            $('.js-compliment-msg').html(complimentMessage);
        });
    },
    generateTip() {
        $(".js-generate-tip").on("click", function () {
            var tipMessages = window.tipMessages || [];
            var tipMessage = tipMessages[getRandomInt(0, tipMessages.length)] || '';
            $('.js-tip-msg').html(tipMessage);
            if ($(this).hasClass('js-generate-tip--rotate')) {
                rotateIcon($(this).find('img'));
            }
        });
    }
};
