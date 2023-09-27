'use strict';

// SFRA Includes
var server = require('server');

// SFCC System Class Includes
var Transaction = require('dw/system/Transaction');
var BasketMgr = require('dw/order/BasketMgr');

// Module Includes
var ShippingHelpers = require('app_storefront_base/cartridge/scripts/checkout/shippingHelpers');
var customShippingHelpers = require('*/cartridge/scripts/checkout/customShippingHelpers');
var COHelpers = require('app_storefront_base/cartridge/scripts/checkout/checkoutHelpers');

// Extend the base controller.
server.extend(module.superModule);

/**
 * @extends CheckoutAddressServices-AddNewAddress
 *
 * Adds a new address for any specified shipment from the form values entered
 * by the customer on the Checkout shipping page.
 */
server.append('AddNewAddress', function (req, res, next) {
    var shipmentUUID = req.form.shipmentSelector || req.form.shipmentUUID;
    var origUUID = req.form.originalShipmentUUID;
    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var viewData = res.getViewData();
    var currentCustomer = req.currentCustomer;
    var pliUUID = req.form.productLineItemUUID;
    var currentBasket = BasketMgr.getCurrentBasket();
    var productLineItem = COHelpers.getProductLineItem(currentBasket, pliUUID);
    var form = server.forms.getForm('shipping');

    // verify shipping form data
    var shippingFormErrors = COHelpers.validateShippingForm(form.shippingAddress);

    if (!(Object.keys(shippingFormErrors).length > 0)) {
        viewData.giftTo = form.shippingAddress.giftTo.value;
        viewData.giftFrom = form.shippingAddress.giftFrom.value;
        viewData.giftMessage = form.shippingAddress.giftMessage.value;
        viewData.isGift = !empty(viewData.giftTo) || !empty(viewData.giftFrom) || !empty(viewData.giftMessage);
        viewData.email = form.shippingAddress.addressFields.email.value || null;

        res.setViewData(viewData);

        this.on('route:BeforeComplete', function (beforeCompleteReq, beforeCompleteRes) {
            var shippingData = beforeCompleteRes.getViewData();
            var shipment;

            try {
                Transaction.wrap(function () {
                    if (origUUID === shipmentUUID) {
                        shipment = ShippingHelpers.getShipmentByUUID(currentBasket, shipmentUUID);
                    } else {
                        shipment = productLineItem.getShipment();
                    }

                    var shippingAddress = shipment.shippingAddress;

                    if (!shippingAddress) {
                        shippingAddress = currentBasket.defaultShipment.createShippingAddress();
                    }
                    shippingAddress.custom.email = shippingData.email || '';
                });
            } catch (err) {
                beforeCompleteRes.setStatusCode(500);
                beforeCompleteRes.json({
                    error: true,
                    errorMessage: err
                });

                return;
            }

            var giftResult = COHelpers.setGift(
                    shipment,
                    shippingData.isGift,
                    shippingData.giftTo,
                    shippingData.giftFrom,
                    shippingData.giftMessage
                );

            if (giftResult.error) {
                beforeCompleteRes.json({
                    error: giftResult.error,
                    fieldErrors: [],
                    serverErrors: [giftResult.errorMessage]
                });
                return;
            }
            var usingMultiShipping = beforeCompleteReq.session.privacyCache.get('usingMultiShipping');
            var currentLocale = Locale.getLocale(beforeCompleteReq.locale.id);

            var basketModel = new OrderModel(
                currentBasket,
                { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
            );

            var shipping = customShippingHelpers.getShippingModels(currentBasket, currentCustomer, 'basket');
            basketModel.shipping = shipping;

            beforeCompleteRes.json({
                customer: new AccountModel(beforeCompleteReq.currentCustomer),
                order: basketModel,
                form: server.forms.getForm('shipping')
            });
        });
    }


    next();
});

module.exports = server.exports();
