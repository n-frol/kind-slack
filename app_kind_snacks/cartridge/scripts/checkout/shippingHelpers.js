'use strict';

/**
 * shippingHelpers.js
 * @extends app_storefront_base/cartridge/scripts/checkout/shippingHelpers.js
 *
 * This file is here to override take precedence over the version from
 * int_computop which uses the houseNumber field. This field is only needed for
 * PayMorrow payment methods, and complicates the needed processing, so it has
 * been removed for the KIND Snacks site implementation.
 */

var base = module.superModule;

/**
 * Retrieve raw address JSON object from request.form
 *
 * @override - overrides the base version by removing the unwanted houseNumber
 *      property.
 * @param {Request} req - the DW Request object
 * @returns {Object} - raw JSON representing address form data
 */
function getAddressFromRequest(req) {
    return {
        firstName: req.form.firstName,
        lastName: req.form.lastName,
        companyName: req.form.companyName,
        address1: req.form.address1,
        address2: req.form.address2,
        city: req.form.city,
        stateCode: req.form.stateCode,
        postalCode: req.form.postalCode,
        countryCode: req.form.countryCode,
        phone: req.form.phone
    };
}

module.exports = {
    getShippingModels: base.getShippingModels,
    selectShippingMethod: base.selectShippingMethod,
    ensureShipmentHasMethod: base.ensureShipmentHasMethod,
    getShipmentByUUID: base.getShipmentByUUID,
    getAddressFromRequest: getAddressFromRequest,
    getApplicableShippingMethods: base.getApplicableShippingMethods
};
