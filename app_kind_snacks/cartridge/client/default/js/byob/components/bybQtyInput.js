'use-strict';

const _ = require('lodash');
const textUtils = require('kind/components/textUtils');

/**
 * Drives a dynamic quantity field with plus and minus buttons
 */

module.exports = {
    init: function () {
        $('body')
        .on('click', '.js-byob-qty__btn', function (e) {
            const $currentTarget = $(e.currentTarget);
            const $currentInput = $currentTarget.closest('.js-qty').find('.js-byob-qty__input');

            // sync all inputs
            $currentInput
                .val((_.toInteger($currentInput.val()) + _.toInteger($currentTarget.val())))
                .change();
        })
        .on('change', '.js-byob-qty__input', function (e) {
            // sync inputs and force to positive integer values
            const $currentInput = $(e.currentTarget);
            const min = _.toInteger($currentInput.attr('min'));
            const max = _.toInteger($currentInput.attr('max'));
            let newVal = Math.abs(_.toInteger($currentInput.val()));
            // enforce min and max values
            let newValMin = newVal >= min ? newVal : min;
            newVal = newVal <= max ? newValMin : max;

            $currentInput.val(newVal);
            $(".c-qty__btn--decrease").attr("style", "background: #fff !important");

            if ($('.js-qty__num-items').length) {
                const $container = $('.js-qty__num-items__container');
                const containerText = $container.data('container');

                if (containerText) {
                    $container.html((newVal === 1 ? containerText : textUtils.pluralize(containerText)));
                }
            }
        });
    }
};
