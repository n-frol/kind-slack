'use strict';

/**
 * creates a plain object that contains address information
 * @param {dw.order.OrderAddress} addressObject - User's address
 * @returns {Object} an object that contains information about the users address
 */
function createAddressObject(addressObject, email, companyName, addressId) {
    var result;
    if (addressObject) {
        result = {
            address1: addressObject.address1,
            address2: addressObject.address2,
            city: addressObject.city,
            firstName: addressObject.firstName,
            lastName: addressObject.lastName,
            ID: Object.hasOwnProperty.call(addressObject, 'ID')
                ? addressObject.ID : null,
            addressId: addressId,
            phone: addressObject.phone,
            postalCode: addressObject.postalCode,
            stateCode: addressObject.stateCode,
            jobTitle: addressObject.jobTitle,
            postBox: addressObject.postBox,
            salutation: addressObject.salutation,
            secondName: addressObject.secondName,
            suffix: addressObject.suffix,
            suite: addressObject.suite,
            title: addressObject.title
        };

        if (!empty(email)) {
            result.email = email;
        }

        if (!empty(companyName)) {
            result.companyName = companyName;
        }

        // dotsource custom: housenumber
        if (addressObject.custom && addressObject.custom.houseNumber) {
            result.houseNumber = addressObject.custom.houseNumber;
        }

        if (result.stateCode === 'undefined') {
            result.stateCode = '';
        }

        if (Object.hasOwnProperty.call(addressObject, 'countryCode')) {
            result.countryCode = {
                displayValue: addressObject.countryCode.displayValue,
                value: addressObject.countryCode.value
            };
        }
    } else {
        result = null;
    }
    return result;
}

/**
 * Address class that represents an orderAddress
 * @param {dw.order.OrderAddress} addressObject - User's address
 * @constructor
 */
function address(addressObject) {

    // !!pcb20190101 -- This is extremely ugly. For some reason, the OrderAddress
    // instance that gets passed in here does not contain the email custom attribute.
    // I don't know any other way to get the address' email into the model.

    var email;
    var companyName;
    var addressId;
    if (!empty(session.customer.addressBook) && !empty(addressObject)) {
        for (var i = 0; i < session.customer.addressBook.addresses.length; i++) {
            var apiAddress = session.customer.addressBook.addresses[i];
            if (addressObject.firstName === apiAddress.firstName &&
                addressObject.lastName === apiAddress.lastName &&
                addressObject.address1 === apiAddress.address1 &&
                addressObject.address2 == apiAddress.address2 &&
                addressObject.city === apiAddress.city &&
                addressObject.stateCode === apiAddress.stateCode &&
                addressObject.postalCode === apiAddress.postalCode) {
                email = apiAddress.custom.email;
                companyName = apiAddress.companyName;
                addressId = Object.hasOwnProperty.call(addressObject, 'ID')
                ? addressObject.ID : apiAddress.ID;
            }
        }
    }

    this.address = createAddressObject(addressObject, email, companyName, addressId);
}

module.exports = address;
