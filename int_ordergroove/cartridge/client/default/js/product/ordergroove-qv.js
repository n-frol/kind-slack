'use strict';

function setQuantity() {
    $('.product-quickview').on('change', '.quantity-select', function (e) {
        e.preventDefault();
        if (window.OG && window.OG.setQuantity) {
            window.OG.setQuantity({
                id: $(this).find('.product-quickview').data('pid'),
                module: $(this).find('.product-quickview .og-offer').data('og-module'),
                quantity: $(this).find('.product-quickview .quantity-select').val()
            });
        }
    });
}

function updateCart() {
    $('body').on('product:afterAddToCart', function (e, data) {
        if (window.OG && window.OG.updateCart) {
            window.OG.updateCart({
                id: $(this).find('.product-quickview').data('pid'),
                module: $(this).find('.product-quickview .og-offer').data('og-module'),
                quantity: $(this).find('.product-quickview .quantity-select').val()
            });
        }
    });
}

module.exports = {
    setProduct: function () {
        $('body').on('quickview:afterShow', function () {
            if (window.OG && window.OG.setProduct) {
                window.OG.setProduct({
                    id: $(this).find('.product-quickview').data('pid'),
                    module: $(this).find('.product-quickview .og-offer').data('og-module'),
                    quantity: $(this).find('.product-quickview .quantity-select').val()
                });
            }
            setQuantity();
            updateCart();
        });
    }
};
