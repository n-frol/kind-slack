'use strict';

/**
 * Validates the form.
 * @returns {Object} jQuery input object.
 */
function validate() {
    var valid = true;

    var $fe = jQuery('#form-error');
    var errorMsg = $fe.data('error-msg');

    // clear out any previous error markers
    jQuery('#total-donations-display-wrapper').find('.error').removeClass('error');

    // must have a default charity defined
    var $charity = jQuery('input[name=default_charity]');
    if (!$charity.val()) {
        $fe.html(errorMsg.default_charity);
        valid = false;
    }

    // if total donations display is enabled, then validate the min and start values
    if (valid && jQuery('input[name=total_donations_toggle]').prop('checked')) {
        var $start = jQuery('input[name=total_donations_start]');
        var startVal = 0;
        if ($start.val()) {
            startVal = parseFloat($start.val().replace(/[^0-9.]/g, ''));
            if (isNaN(startVal)) {
                $fe.html(errorMsg.start_value);
                $start.parent().children().addClass('error');
                valid = false;
            } else {
                $start.val(startVal.toFixed(2));
            }
        }

        if (valid) {
            var $min = jQuery('input[name=total_donations_minimum]');
            var minVal = 0;
            if ($min.val()) {
                minVal = parseFloat($min.val().replace(/[^0-9.]/g, ''));
                if (isNaN(minVal)) {
                    $fe.html(errorMsg.min_value);
                    $min.parent().children().addClass('error');
                    valid = false;
                } else {
                    $min.val(minVal.toFixed(2));
                }
            }
        }
    }

    return valid;
}

/**
 * Clears the search.
 */
function clearSearch() {
    jQuery('#charity-search').val('').prop('disabled', false);
    jQuery('#charity-button-wrapper').addClass('hide');
}

/**
 * Shows the error message.
 * @param {string} errorMsg Error message.
 */
function displaySearchError(errorMsg) {
    var $error = jQuery('#search-error');

    $error.text(errorMsg);
    $error.removeClass('hide');

    setTimeout(() => {
        $error.addClass('hide');
    }, 10000);
}

/**
 * Initialize the dashboard.
 */
function init() {
    var $selects = jQuery('form select');
    var $exceptionInput = jQuery('#category-exclusions');
    var categories = $exceptionInput.data('init');

    $selects.each((i, e) => {
        var $e = jQuery(e);
        var selected = $e.data('init');

        if (selected) {
            $e.find('option[value=' + selected + ']').prop('selected', true);
        }
    });

    if (categories) {
        categories = categories.split(',');
    }

    for (var idx = 0; idx < categories.length; idx++) {
        $exceptionInput.find('option[value=' + categories[idx] + ']').prop('selected', true);
    }

    jQuery('#donation-type-option').trigger('change');
}

module.exports = () => {
    if (jQuery('#featured-charity-data').find('input').length) {
        jQuery('#no-charities-msg').hide();
    }

    jQuery('#search-clear-control').on('click', (e) => { // eslint-disable-line no-unused-vars
        clearSearch();
    });

    jQuery('#select-default-btn').on('click', (e) => { // eslint-disable-line no-unused-vars
        var $searchInput = jQuery('#charity-search');
        var $charityInput = jQuery('#default-charity-data').find('input');

        $charityInput.attr('value', $searchInput.val());
        $charityInput.data('charity-data', $searchInput.data('charity-data'));

        clearSearch();
        jQuery('#charity-button-wrapper').addClass('hide');
    });

    jQuery('#add-featured-btn').on('click', (e) => { // eslint-disable-line no-unused-vars
        const FEATURED_LIMIT = 4;
        var $searchInput = jQuery('#charity-search');
        var $charityContainer = jQuery('#featured-charity-data');
        var inputCount = $charityContainer.find('input').length;
        var inputElem = null;
        var listElem = null;

        if (inputCount < FEATURED_LIMIT) {
            inputElem = document.createElement('input');
            jQuery(inputElem)
                .addClass('charity-data')
                .attr('type', 'text')
                .attr('name', 'featured_charity_' + parseInt(inputCount + 1))
                .attr('value', $searchInput.val())
                .prop('disabled', true)
                .data('charity-data', $searchInput.data('charity-data'));

            listElem = document.createElement('li');
            $charityContainer.find('#featured-list').append(listElem);
            jQuery(listElem).append(inputElem).append('<i class="fa fa-times" class="remove-featured" aria-hidden="true"></i>');
            jQuery('#no-charities-msg').hide();
        } else {
            displaySearchError('You have reached the limit of featured charities');
        }

        clearSearch();
        jQuery('#charity-button-wrapper').addClass('hide');
    });

    jQuery('#featured-list').on('click', 'i', function (e) { // eslint-disable-line no-unused-vars
        jQuery(this).parent('li').remove();

        if (!jQuery('#featured-charity-data').find('input').length) {
            jQuery('#no-charities-msg').show();
        }
    });

    jQuery('#donation-type-option').on('change', function (e) { // eslint-disable-line no-unused-vars
        var amountWrapper = jQuery('#donation-type-amount-wrapper');
        var roundupWrapper = jQuery('#roundup-whole-flag-wrapper');

        if (this.value === 'fixed' || this.value === 'percentage') {
            amountWrapper.find('#type-amount').text(jQuery(this).find('option:selected').text());
            amountWrapper.find('#donation-type-amount').prop('disabled', false);
            amountWrapper.removeClass('hidden');
            roundupWrapper.addClass('hidden');
        } else {
            amountWrapper.find('#type-amount').prop('disabled', true);
            amountWrapper.addClass('hidden');
            roundupWrapper.removeClass('hidden');
        }
    });

    jQuery('form#changeup-config').on('submit', function (e) {
        e.preventDefault();
        var $form = jQuery(this);
        var $btn = jQuery(this).find('button');
        var data = {};

        if (validate()) {
            data.customer_search_toggle = jQuery('input[name=customer_search_toggle]').prop('checked');
            data.default_charity = $form.find('input[name=default_charity]').data('charity-data');
            data.featured_charities = [];
            $form.find('input[name^=featured_charity_]').each((i, f) => {
                data.featured_charities.push(jQuery(f).data('charity-data'));
            });
            data.donation_type_actor = $form.find('select[name=donation_type_actor] option:selected').val();
            data.donation_type_option = $form.find('select[name=donation_type_option] option:selected').val();
            data.donation_type_amount = $form.find('#donation-type-amount:not(:disabled)').val();
            data.donation_display_type = $form.find('select[name=donation_display_type] option:selected').val();
            data.verified_charity_flag = jQuery('#verified-charity-flag').prop('checked');
            data.category_exclusions = [];
            jQuery('#category-exclusions option:selected').each((i, f) => {
                data.category_exclusions.push(f.value);
            });
            data.total_donations_toggle = jQuery('input[name=total_donations_toggle]').prop('checked');
            data.total_donations_start = jQuery('input[name=total_donations_start]').val();
            data.total_donations_min = jQuery('input[name=total_donations_minimum]').val();

            jQuery.ajax({
                url: $form.attr('action'),
                headers: {
                    'content-type': 'application/json'
                },
                dataType: 'json',
                method: 'post',
                data: JSON.stringify(data)
            })
            .done((res) => {
                var $nb = jQuery('#notify-box');
                var statusClass = null;

                if (res && res.success) {
                    $nb.text('Config saved!');
                    statusClass = 'success';
                } else {
                    $nb.text('Config failed to save :(');
                    statusClass = 'failure';
                }

                $nb.addClass(statusClass);
                $nb.removeClass('hide');

                /**
                 * Reset the class.
                 * @param {Object} f Event
                 */
                function resetClass(f) { // eslint-disable-line no-unused-vars
                }

                setTimeout(($elem, cls) => {
                    $elem.addClass('hide').off().on('transitionend', (f) => { // eslint-disable-line no-unused-vars
                        if ($elem.css('opacity') === 0) {
                            $elem.removeClass(cls);
                        }
                    });
                }, 7000, $nb, statusClass);
            })
            .always(() => {
                $btn.prop('disabled', false);
            });
        } else {
            var $fe = jQuery('#form-error');

            $fe.removeClass('hide');

            setTimeout(($elem) => {
                $elem.addClass('hide');
            }, 7000, $fe);
        }
    });

    init();
};
