'use strict';

var base = module.superModule;

/**
 * Retrieve raw address JSON object from request.form
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
        houseNumber: { // dotsource custom
            custom: true,
            value: typeof req.form.houseNumber !== 'undefined' ?
                req.form.houseNumber : ''
        },
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
