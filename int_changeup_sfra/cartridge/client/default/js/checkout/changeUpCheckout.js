'use strict';

module.exports = function () {
    var $cache = {
        checkbox: $('#donation-checkbox'),
        donationTotal: $('#donation-total'),
        productsTotal: $('.order-product-summary .grand-total-price')
    };

    $cache.checkbox.on('click keydown', function (e) {
        if (e.type === 'keydown' && e.keyCode !== 32) {
            return;
        }
        e.preventDefault();
        $(this).toggleClass('checked');

        $.ajax({
            url: $(this).data('url'),
            method: 'post',
            headers: {
                'content-type': 'application/json'
            },
            data: JSON.stringify({
                decision: $(this).hasClass('checked'),
                zip: $(".shippingZipCode").val(),
                phone: $(".shippingPhoneNumber").val(),
                shippingForm_firtsName: $('.shippingFirstName').val(),
                shippingForm_lastName: $('.shippingLastName').val(),
                shippingForm_addressOne: $('.shippingAddressOne').val(),
                shippingForm_addressTwo: $('.shippingAddressTwo').val(),
                shippingForm_countryCode: $('.shippingCountry').val(),
                shippingForm_phone: $('.shippingPhoneNumber').val(),
                shippingForm_zipCode: $('.shippingZipCode').val(),
                shippingForm_city: $('.shippingAddressCity').val()
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

        if ($cache.productsTotal.length) {
            $cache.productsTotal.text(data.order.totals.subTotal);
        }
    });
};
