/* global empty */

'use strict';

/**
 * CheckoutShippingServices.js
 * A controller for overriding the default behavior of the
 * CheckoutShippingServices endpoints defined in the SFRA for address
 * validation with the SmartyStreets address validation API.
 */

// SFCC System class imports.
var BasketMgr = require('dw/order/BasketMgr');
var Locale = require('dw/util/Locale');

// Script Module Requires.
var server = require('server');
var formErrors = require('*/cartridge/scripts/formErrors');
var AddressVerification = require('*/cartridge/models/addressVerification');
var AccountModel = require('*/cartridge/models/account');
var OrderModel = require('*/cartridge/models/order');

server.extend(module.superModule);

/**
 * Prepends the CheckoutShippingService-SubmitShipping controller endpoint with
 * a call to the SmartyStreets address validation service if the site pref is
 * enabled.
 *
 * If the address is found to be valid, or the check is not enabled, the call
 * will continue on to the base endpoint. If the address is not found to be
 * valid, the user will be routed accordingly, depending on what types of
 * products are in the basket.
 *
 * See TSD for details on conditions when address is not validated:
 *  - https://pixelmedia.atlassian.net/wiki/spaces/KND/pages/816283957/Smarty+Streets+Address+Verification
 */
server.prepend('SubmitShipping', function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();

    // Let the base endpoint handle the call if the basket is not found.
    if (!empty(basket)) {
        var form = server.forms.getForm('shipping');

        // Validate the form before making service call.
        var validationErrors = formErrors.getFormErrors(
            form.shippingAddress.addressFields
        );

        // Check if validation errors were returned.
        if (empty(Object.keys(validationErrors))) {
            // Create an instance of the AddressVerification model.
            var addressVerification = new AddressVerification(
                form.shippingAddress.addressFields, req);
            var verifyViewData = addressVerification.getViewData();

            if (!addressVerification.allowCurrent) {
                // Clear the session variable if the address must be valid.
                req.session.privacyCache.set('allowedAddresses', null);
            }

            if (verifyViewData.showModal && !empty(verifyViewData.suggested)) {
                // If showing a modal to select an address, store the UUID's for
                // the allowed addresses so we know they are valid when posting
                // back. Create a single string from the UUIDs.
                var allowedAddresses = '';
                verifyViewData.suggested.forEach(function (address) {
                    allowedAddresses += address.UUID || '';
                });

                // Set the string to session storage.
                req.session.privacyCache.set('allowedAddresses',
                    allowedAddresses);
            } else {
                // Clear the session variable if the result is valid.
                req.session.privacyCache.set('allowedAddresses', null);
            }

            var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
            var currentLocale = Locale.getLocale(req.locale.id);

            var basketModel = new OrderModel(
                basket,
                { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
            );

            res.json({
                order: basketModel,
                customer: new AccountModel(req.currentCustomer),
                addressVerification: verifyViewData
            });
        }
    }

    return next();
});

module.exports = server.exports();
