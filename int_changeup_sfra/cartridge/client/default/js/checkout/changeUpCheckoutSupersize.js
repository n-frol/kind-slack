'use strict';

module.exports = function () {
    var $cache = {
        checkbox: $('#donation-checkbox-supersize'),
        donationTotal: $('#donation-total'),
        productsTotal: $('.order-product-summary .grand-total-price'),
        three_options_no: $('#three_options_no'),
        three_options_value_one: $('#three_options_value_one'),
        three_options_value_two: $('#three_options_value_two'),
        three_options_value_three: $('#three_options_value_three'),
        two_plus_options_no: $('#two_plus_options_no'),
        two_plus_options_value_one: $('#two_plus_options_value_one'),
        two_plus_options_value_two: $('#two_plus_options_value_two'),
        two_plus_options_value_plus: $('#two_plus_plus')        
    };

    $cache.checkbox.on('click keydown', function (e) {
        if (e.type === 'keydown' && e.keyCode !== 32) {
            return;
        }
        e.preventDefault();
        $(this).toggleClass('checked');
        if($(this).hasClass('checked')){
            requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));
        } else {
            requestUpdateDonationConfirmation(0, $(this).data('url'));
        }
      
    });

   

    $cache.three_options_no.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.three_options_value_one.removeClass('active');
            $cache.three_options_value_two.removeClass('active');
            $cache.three_options_value_three.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));
    });

    $cache.three_options_value_one.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.three_options_no.removeClass('active');
            $cache.three_options_value_two.removeClass('active');
            $cache.three_options_value_three.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));        
    });

    $cache.three_options_value_two.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.three_options_no.removeClass('active');
            $cache.three_options_value_one.removeClass('active');
            $cache.three_options_value_three.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));        

    });

    $cache.three_options_value_three.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.three_options_no.removeClass('active');
            $cache.three_options_value_one.removeClass('active');
            $cache.three_options_value_two.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));        

    });

    $cache.two_plus_options_no.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.two_plus_options_value_one.removeClass('active');
            $cache.two_plus_options_value_two.removeClass('active');
            $cache.two_plus_options_value_plus.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));
    });

    $cache.two_plus_options_value_one.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.two_plus_options_no.removeClass('active');
            $cache.two_plus_options_value_two.removeClass('active');
            $cache.two_plus_options_value_plus.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));
    });

    $cache.two_plus_options_value_two.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.two_plus_options_no.removeClass('active');
            $cache.two_plus_options_value_one.removeClass('active');
            $cache.two_plus_options_value_plus.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).data('value'), $(this).data('url'));        

    });

    $cache.two_plus_options_value_plus.on('click', function (e) {
        if(!$(this).hasClass('active')){
            $cache.two_plus_options_no.removeClass('active');
            $cache.two_plus_options_value_one.removeClass('active');
            $cache.two_plus_options_value_two.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).val(), $(this).data('url'));        

    });

    $cache.two_plus_options_value_plus.on('change', function (e) {
        if(!$(this).hasClass('active')){
            $cache.two_plus_options_no.removeClass('active');
            $cache.two_plus_options_value_one.removeClass('active');
            $cache.two_plus_options_value_two.removeClass('active');
            $(this).addClass('active')
        } 
        requestUpdateDonationConfirmation($(this).val(), $(this).data('url'));        

    });

    $('body').on('checkout:updateCheckoutView', (e, data) => {
        if ($cache.productsTotal.length) {
            $cache.productsTotal.text(data.order.totals.grandTotal);
        }
    });
};


function requestUpdateDonationConfirmation(supersize_value, element_url){
    $.ajax({
        url: element_url,
        method: 'post',
        headers: {
            'content-type': 'application/json'
        },
        data: JSON.stringify({
            decision: $('#donation-checkbox').hasClass('checked'),
            shippingForm_firtsName: $('.shippingFirstName').val(),
            shippingForm_lastName: $('.shippingLastName').val(),
            shippingForm_addressOne: $('.shippingAddressOne').val(),
            shippingForm_addressTwo: $('.shippingAddressTwo').val(),
            shippingForm_countryCode: $('.shippingCountry').val(),
            shippingForm_phone: $('.shippingPhoneNumber').val(),
            shippingForm_zipCode: $('.shippingZipCode').val(),
            shippingForm_city: $('.shippingAddressCity').val(),
            supersize_value: supersize_value
        })
    })
    .done((data) => {
        if (data.order && data.customer) {
            $('body').trigger('checkout:updateCheckoutView', data);
        }
    });
}