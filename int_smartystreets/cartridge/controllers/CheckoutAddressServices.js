/* global empty */

'use strict';

/**
 * CheckoutAddressService.js
 * A controller to extend and override defined controller endpoints from the
 * app_storefront_base CheckoutAddressServices controller. These endpoints are
 * extended in order to provide address validation through API calls from the
 * smartystreets.http service before saving a new address to the user's basket.
 */

// Script module imports.
var server = require('server');
var formErrors = require('*/cartridge/scripts/formErrors');
var AddressVerification = require('*/cartridge/models/addressVerification');

server.extend(module.superModule);

/**
 * Prepends the CheckoutShippingService-AddNewAddress controller endpoint with
 * an address validation if the site pref is enabled. The address is validated
 * using the smartystreets.http service which in turn calls the SmartyStreets
 * US street address verification API to validate an address.
 */
server.prepend('AddNewAddress', function (req, res, next) {
    var form = server.forms.getForm('shipping');
    // Validate the form before making service call.
    var validationErrors = formErrors.getFormErrors(
        form.shippingAddress.addressFields
    );

    // Check that the form validates, and don't make the validation API call if
    // there are errors. Let the original endpoint handle invalidation of the
    // form.
    if (empty(Object.keys(validationErrors))) {
        // Create an instance of the AddressVerification model.
        var addressVerification = new AddressVerification(
            form.shippingAddress.addressFields, req);
        var viewData = addressVerification.getViewData();

        if (!viewData.serviceSuccess) {
            // SFCC System Import
            var Resource = require('dw/web/Resource');

            // Add JSON for errors to the response.
            res.json({
                error: true,
                errMessage: Resource.msg('addressverification.server_error',
                    'address_verification', null)
            });

            return next();
        } else if (viewData.showModal && !empty(viewData.suggested)) {
            // If showing a modal to select an address, store the UUID's for
            // the allowed addresses so we know they are valid when posting
            // back. Create a single string from the UUIDs.
            var allowedAddresses = '';
            viewData.suggested.forEach(function (address) {
                allowedAddresses += address.UUID || '';
            });

            // Set the string to session storage.
            req.session.privacyCache.set('allowedAddresses', allowedAddresses);
        } else {
            // Clear the session variable if the result is valid.
            req.session.privacyCache.set('allowedAddresses', null);
        }

        res.json({
            addressVerification: viewData
        });
    }

    return next();
});

module.exports = server.exports();
