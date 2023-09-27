'use strict';

/**
 * Generates random integer number
 * @param {number} min - minimal interval value
 * @param {number} max - maximum interval value
 * @returns {number} - Generated integer number that will be between input interval
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - (min + 1))) + min;
}

module.exports = function () {
    $(".js-generate-compliment").on("click", function () {
        var complimentMessages = window.complimentMessages || [];
        var complimentMessage = complimentMessages[getRandomInt(0, complimentMessages.length)] || '';
        $('.js-compliment-msg').html(complimentMessage);
    });
};
