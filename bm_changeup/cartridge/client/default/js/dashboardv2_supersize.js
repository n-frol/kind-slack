'use strict';
window.jQuery = require('jquery');
jQuery.noConflict();
jQuery(document).ready(function ($) {

    function populateSelectInitFirstOption(options, selector, selectedValueSelector) {
        $.each(options, function (i, item) {
            var amount = '$' + parseFloat(item, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
            $('#' + selector).append($('<option>', {
                value: item,
                text: amount
            }));
        });
        if ($('#' + selectedValueSelector).val() != '' && $('#' + selectedValueSelector).val() != null && $('#' + selectedValueSelector).val() != undefined && $('#' + selectedValueSelector).val() != 'null' && $('#' + selectedValueSelector).val() != 'undefined') {
            $('#' + selector).val($('#' + selectedValueSelector).val());
        } else {
            $('#' + selector + ':first').attr('selected', 'selected');
            $('#' + selector).get(0).dispatchEvent(new Event('change'));
        }
    }

    function populateSelectInit(options, selector, selectedValueSelector, prevSelector) {
        populateSelect(options, selector, prevSelector);
        if(selectedValueSelector == ''){
            $('#' + selector + ':first').attr('selected', 'selected');
            $('#' + selector).get(0).dispatchEvent(new Event('change'));
        } else {
            if ($('#' + selectedValueSelector).val() != '' && $('#' + selectedValueSelector).val() != null && $('#' + selectedValueSelector).val() != undefined && $('#' + selectedValueSelector).val() != 'null' && $('#' + selectedValueSelector).val() != 'undefined') {
                $('#' + selector).val($('#' + selectedValueSelector).val());
                $('#' + selector).removeAttr('disabled');
            } else {
                $('#' + selector + ':first').attr('selected', 'selected');
                $('#' + selector).get(0).dispatchEvent(new Event('change'));
            }
        }
    }

    function populateSelects(options, selector, selectorTwo, selectorThree) {
        populateNextSelect(options, selector, selectorTwo, selectorThree);
        if (selectorThree != '') {
            populateNextSelect(options, selectorTwo, selectorThree, '');
        }
    }

    function populateNextSelect(options, selector, nextSelector, selectorThree) {
        $('#' + nextSelector).find('option[value]').remove();
        $.each(options, function (i, item) {
            if (parseFloat(item) > $('#' + selector).val()) {
                var amount = '$' + parseFloat(item, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                $('#' + nextSelector).append($('<option>', {
                    value: item,
                    text: amount
                }));
            }
        });
        if (nextSelector == 'supersize_two_plus_option_plus') {
            $('#two_plus_plus').empty();
            $('#' + nextSelector + ' > option').clone().appendTo('#two_plus_plus');
            var values = '';
            $('#' + nextSelector + ' option').each(function () {
                values = values + $(this).val() + ',';
            });
            values = values.substring(0, values.length - 1);
            $('#input_supersize_two_plus_value_plus').val(values);
            $('#' + nextSelector).attr('disabled', true);
            $('#' + nextSelector + ':first').attr('selected', 'selected');
        }

        if (nextSelector != 'supersize_two_plus_option_plus') {
            $('#' + nextSelector + ':has(option)').removeAttr('disabled');
            $('#' + nextSelector + ':not(:has(option))').attr('disabled', true);
        }

        if (selectorThree == '' && $('#' + selector + ' option').length == 0) {
            $('#' + nextSelector).find('option[value]').remove();
            $('#' + nextSelector).attr('disabled', true);
        }
        $('#' + nextSelector).get(0).dispatchEvent(new Event('change'));
    }

    function populateSelect(options, selector, prevSelector) {
        $('#' + selector).find('option[value]').remove();
        $.each(options, function (i, item) {
            if (parseFloat(item) > $('#' + prevSelector).val()) {
                var amount = '$' + parseFloat(item, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                $('#' + selector).append($('<option>', {
                    value: item,
                    text: amount
                }));
            }
        });
        if (selector == 'supersize_two_plus_option_plus') {
            var values = '';
            $('#' + selector + ' option').each(function () {
                values = values + $(this).val() + ',';
            });
            values = values.substring(0, values.length - 1);
            $('#input_supersize_two_plus_value_plus').val(values);
        }
    }

    var checkExist_supersize_single_option = setInterval(function () {
        if ($('#supersize_single_option').length) {
            var supersize_options = $('#cfg_supersize_options').val();
            var array_sp_options = supersize_options.split(',');
            populateSelectInitFirstOption(array_sp_options, 'supersize_single_option', 'cfg_supersize_single_option_value');
            if ($('#cfg_supersize_single_option_value').val() != '' && $('#cfg_supersize_single_option_value').val() != null && $('#cfg_supersize_single_option_value').val() != 'null' && $('#cfg_supersize_single_option_value').val() != undefined && $('#cfg_supersize_single_option_value').val() != 'undefined') {
                updateDonationButtons('single', $('#cfg_supersize_single_option_value').val(), '', '');
            } else {
                updateDonationButtons('single', $('#supersize_single_option').val(), '', '');
            }
            $('#supersize_single_option').on('change', function () {
                updateDonationButtons('single', $(this).val(), '', '');
            });
            clearInterval(checkExist_supersize_single_option);
        }
    }, 100);

    var checkExist_supersize_three_option_one = setInterval(function () {
        if ($('#supersize_three_option_one').length) {
            var supersize_options = $('#cfg_supersize_options').val();
            var array_sp_options = supersize_options.split(',');
            populateSelectInitFirstOption(array_sp_options, 'supersize_three_option_one', 'cfg_supersize_three_options_one_value');
            if ($('#cfg_supersize_three_options_one_value').val() != '' && $('#cfg_supersize_three_options_one_value').val() != null && $('#cfg_supersize_three_options_one_value').val() != 'null' && $('#cfg_supersize_three_options_one_value').val() != undefined && $('#cfg_supersize_three_options_one_value').val() != 'undefined') {
                updateDonationButtons('three', $('#cfg_supersize_three_options_one_value').val(), '', '');
            } else {
                updateDonationButtons('three', $('#supersize_three_option_one').val(), '', '');
            }
            $('#supersize_three_option_one').on('change', function () {
                populateSelects(array_sp_options, 'supersize_three_option_one', 'supersize_three_option_two', 'supersize_three_option_three');
                updateDonationButtons('three', $(this).val(), $('#supersize_three_option_two').val(), $('#supersize_three_option_three').val());
            });
            clearInterval(checkExist_supersize_three_option_one);
        }
    }, 100);

    var checkExist_supersize_three_option_two = setInterval(function () {
        if ($('#supersize_three_option_two').length) {
            var supersize_options = $('#cfg_supersize_options').val();
            var array_sp_options = supersize_options.split(',');
            populateSelectInit(array_sp_options, 'supersize_three_option_two', 'cfg_supersize_three_options_two_value', 'supersize_three_option_one');
            if ($('#cfg_supersize_three_options_two_value').val() != '' && $('#cfg_supersize_three_options_two_value').val() != null  && $('#cfg_supersize_three_options_two_value').val() != 'null' && $('#cfg_supersize_three_options_two_value').val() != undefined && $('#cfg_supersize_three_options_two_value').val() != 'undefined' ) {
                updateDonationButtons('three', '', $('#cfg_supersize_three_options_two_value').val(), '');
            } else {
                updateDonationButtons('three', '', $('#supersize_three_option_two').val(), '');
            }
            $('#supersize_three_option_two').on('change', function () {
                populateSelects(array_sp_options, 'supersize_three_option_two', 'supersize_three_option_three', '');
                updateDonationButtons('three', '', $(this).val(), $('#supersize_three_option_three').val());
            });
            clearInterval(checkExist_supersize_three_option_two);
        }
    }, 100);

    var checkExist_supersize_three_option_three = setInterval(function () {
        if ($('#supersize_three_option_three').length) {
            var supersize_options = $('#cfg_supersize_options').val();
            var array_sp_options = supersize_options.split(',');
            populateSelectInit(array_sp_options, 'supersize_three_option_three', 'cfg_supersize_three_options_three_value', 'supersize_three_option_two');
            if ($('#cfg_supersize_three_options_three_value').val() && $('#cfg_supersize_three_options_three_value').val() != null && $('#cfg_supersize_three_options_three_value').val() != 'null' && $('#cfg_supersize_three_options_three_value').val() != undefined && $('#cfg_supersize_three_options_three_value').val() != 'undefined') {
                updateDonationButtons('three', '', '', $('#cfg_supersize_three_options_three_value').val());
            } else {
                updateDonationButtons('three', '', '', $('#supersize_three_option_three').val());
            }
            $('#supersize_three_option_three').on('change', function () {
                updateDonationButtons('three', '', '', $(this).val());
            });
            clearInterval(checkExist_supersize_three_option_three);
        }
    }, 100);

    var checkExist_supersize_two_plus_option_one = setInterval(function () {
        if ($('#supersize_two_plus_option_one').length) {
            var supersize_options = $('#cfg_supersize_options').val();
            var array_sp_options = supersize_options.split(',');
            populateSelectInitFirstOption(array_sp_options, 'supersize_two_plus_option_one', 'cfg_supersize_two_plus_option_one_value');
            if ($('#cfg_supersize_two_plus_option_one_value').val() != '' && $('#cfg_supersize_two_plus_option_one_value').val() != null && $('#cfg_supersize_two_plus_option_one_value').val() != 'null' && $('#cfg_supersize_two_plus_option_one_value').val() != undefined && $('#cfg_supersize_two_plus_option_one_value').val() != 'undefined') {
                updateDonationButtons('two_plus', $('#cfg_supersize_two_plus_option_one_value').val(), '', '');
            } else {
                updateDonationButtons('two_plus', $('#supersize_two_plus_option_one').val(), '', '');
            }
            $('#supersize_two_plus_option_one').on('change', function () {
                populateSelects(array_sp_options, 'supersize_two_plus_option_one', 'supersize_two_plus_option_two', 'supersize_two_plus_option_plus');
                updateDonationButtons('two_plus', $(this).val(), $('#supersize_two_plus_option_two').val(), $('#supersize_two_plus_option_plus').val());

            });
            clearInterval(checkExist_supersize_two_plus_option_one);
        }
    }, 100);

    var checkExist_supersize_two_plus_option_two = setInterval(function () {
        if ($('#supersize_two_plus_option_two').length) {
            var supersize_options = $('#cfg_supersize_options').val();
            var array_sp_options = supersize_options.split(',');
            populateSelectInit(array_sp_options, 'supersize_two_plus_option_two', 'cfg_supersize_two_plus_option_two_value', 'supersize_two_plus_option_one');
            if ($('#cfg_supersize_two_plus_option_one_value').val() != '' && $('#cfg_supersize_two_plus_option_one_value').val() != null && $('#cfg_supersize_two_plus_option_one_value').val() != 'null' && $('#cfg_supersize_two_plus_option_one_value').val() != undefined && $('#cfg_supersize_two_plus_option_one_value').val() != 'undefined') {
                updateDonationButtons('two_plus', '', $('#cfg_supersize_two_plus_option_two_value').val(), '');
            } else {
                updateDonationButtons('two_plus', '', $('#supersize_two_plus_option_two').val(), '');
            }
            $('#supersize_two_plus_option_two').on('change', function () {
                populateSelects(array_sp_options, 'supersize_two_plus_option_two', 'supersize_two_plus_option_plus', '');
                updateDonationButtons('two_plus', '', $(this).val(), '');
            });
            clearInterval(checkExist_supersize_two_plus_option_two);
        }
    }, 100);

    var checkExist_supersize_two_plus_option_plus = setInterval(function () {
        if ($('#supersize_two_plus_option_plus').length) {
            var supersize_options = $('#cfg_supersize_options').val();
            var array_sp_options = supersize_options.split(',');
            populateSelectInit(array_sp_options, 'supersize_two_plus_option_plus', '', 'supersize_two_plus_option_two');
            populateSelectInit(array_sp_options, 'two_plus_plus', '', 'supersize_two_plus_option_two');
            $('#supersize_two_plus_option_plus').get(0).dispatchEvent(new Event('change'));
            var values = '';
            $('#supersize_two_plus_option_plus option').each(function () {
                values = values + $(this).val() + ',';
            });
            values = values.substring(0, values.length - 1);
            $('#input_supersize_two_plus_value_plus').val(values);
            clearInterval(checkExist_supersize_two_plus_option_plus);
        }
    }, 100);

    var checkExist_supersize_toggle = setInterval(function () {
        if ($('#supersize_toggle').length) {
            if ($('#cfg_supersize_toggle').val() == 'true') {
                $('.supersize-section').show();

            } else {
                $('.supersize-section').hide();
            }
            $('#supersize_toggle').on('click', function () {
                if ($(this).prop('checked')) {
                    $('.supersize-section').hide("slow");
                    $('.supersize_divider').addClass('d-none');
                    $('.single-option').addClass('d-none');
                    $('.three-options').addClass('d-none');
                    $('.two-plus-options').addClass('d-none');
                } else {
                    $('.supersize-section').show("slow");
                    $('.supersize_divider').removeClass('d-none');
                    supersizeOptionsChange($('input[name="supersize_option"]:checked').val());
                }
            });
            $('.sp-div').on('click', function () {
                if ($('#supersize_toggle').prop('checked') == false) {
                    $('.supersize-section').hide("slow");
                    $('.supersize_divider').addClass('d-none');
                    $('.single-option').addClass('d-none');
                    $('.three-options').addClass('d-none');
                    $('.two-plus-options').addClass('d-none');
                } else if($('#supersize_toggle').prop('checked') == 'checked') {
                    $('.supersize-section').show("slow");
                    $('.supersize_divider').removeClass('d-none');
                    supersizeOptionsChange($('input[name="supersize_option"]:checked').val());
                }
            });
            clearInterval(checkExist_supersize_toggle);
        }
    }, 100);

    var checkExist_supersize_options_sample = setInterval(function () {
        if ($('.single-option').length && $('.three-options').length && $('.two-plus-options').length) {
            var option_class = $('input[name="supersize_option"]:checked').val();
            if ($('#cfg_supersize_toggle').val() == 'true') {
                $('.supersize_divider').removeClass('d-none');
                supersizeOptionsChange(option_class);
            } else {
                $('.supersize_divider').addClass('d-none');
                $('.single-option').addClass('d-none');
                $('.three-options').addClass('d-none');
                $('.two-plus-options').addClass('d-none');
            }
            $('.radio-wrap').on('click', function () {
                supersizeOptionsChange($(this).find('input[name="supersize_option"]').val());
            });
            clearInterval(checkExist_supersize_options_sample);
        }
    }, 100);

    function supersizeOptionsChange(option_class) {
        switch (option_class) {
            case 'single':
                $('.single-option').removeClass('d-none');
                $('.three-options').addClass('d-none');
                $('.two-plus-options').addClass('d-none');
                break;

            case 'three':
                $('.single-option').addClass('d-none');
                $('.three-options').removeClass('d-none');
                $('.two-plus-options').addClass('d-none');
                break;

            case 'two_plus':
                $('.single-option').addClass('d-none');
                $('.three-options').addClass('d-none');
                $('.two-plus-options').removeClass('d-none');
                break;
        }
    }

    function updateDonationButtons(option, value1, value2, value3) {
        switch (option) {
            case 'single':
                var amount = '$' + parseFloat(value1, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                $('.single-option .supersize-donation .main-quantity').text(amount);
                break;

            case 'three':
                if (value1 != '') {
                    var amount1 = '$' + parseFloat(value1, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                    $('.three-options .supersize-donation .available-options .supersize-btn-group button#three_one').text(amount1);

                }
                if (value2 != '') {
                    var amount2 = '$' + parseFloat(value2, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                    $('.three-options .supersize-donation .available-options .supersize-btn-group button#three_two').text(amount2);

                }
                if (value3 != '') {
                    var amount3 = '$' + parseFloat(value3, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                    $('.three-options .supersize-donation .available-options .supersize-btn-group button#three_three').text(amount3);

                }

                break;

            case 'two_plus':
                if (value1 != '') {
                    var amount1 = '$' + parseFloat(value1, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                    $('.two-plus-options .supersize-donation .available-options .supersize-btn-group button#two_plus_one').text(amount1);

                }
                if (value2 != '') {
                    var amount2 = '$' + parseFloat(value2, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString();
                    $('.two-plus-options .supersize-donation .available-options .supersize-btn-group button#two_plus_two').text(amount2);

                }
                break;
        }
    }

});
