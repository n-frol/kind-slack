'use strict';

module.exports = function () {
    var $cache = {
        checkbox: $('#donation-checkbox'),
        donationTotal: $('#donation-total'),
        productsTotal: $('.order-product-summary .grand-total-price')
    };

    $cache.checkbox.on('click keydown', function (e) {
        let supersize_value = null;
        let selected_org_uuid = document.querySelector('input[name=selected_carity]:checked').value;

        if (e.type === 'keydown' && e.keyCode !== 32) {
            return;
        }
        e.preventDefault();
        $(this).toggleClass('checked');

        $('.donation-button-group').children().each(function () {
            if($(this).hasClass('active')){
                supersize_value = $(this).data('value');
            }
        });
        $.ajax({
            url: $(this).data('url'),
            method: 'post',
            headers: {
                'content-type': 'application/json'
            },
            data: JSON.stringify({
                decision: $(this).hasClass('checked'),
                shippingForm_firtsName: $('.shippingFirstName').val(),
                shippingForm_lastName: $('.shippingLastName').val(),
                shippingForm_addressOne: $('.shippingAddressOne').val(),
                shippingForm_addressTwo: $('.shippingAddressTwo').val(),
                shippingForm_countryCode: $('.shippingCountry').val(),
                shippingForm_phone: $('.shippingPhoneNumber').val(),
                shippingForm_zipCode: $('.shippingZipCode').val(),
                shippingForm_city: $('.shippingAddressCity').val(),
                selected_org_uuid: selected_org_uuid,
                supersize_value: supersize_value
            })
        })
        .done((data) => {
            if (data.order && data.customer) {
                $('body').trigger('checkout:updateCheckoutView', data);
            }
        });
    });

    $('body').on('checkout:updateCheckoutView', (e, data) => {
        if(!data.supersize){
            if (data.order.changeup && data.order.changeup.amount) {
                $cache.donationTotal.text(data.order.changeup.amount || '-');
            }
        }

        if (data.order.totals.donationTotalAmount) {
            $('.donation-item').removeClass('d-none');
            $('.donation-total').text(data.order.totals.donationTotalAmount);
        }else{
            $('.donation-item').addClass('d-none');
        }
    });
};
