/* global empty, request */

'use strict';

/**
 * models/addressVerification.js
 * A data model which contains all of the necessary attributes for displaying
 * the proper data to the user after an address is verified, or corrected
 * by calling the smartystreets.http address verification service.
 */

// SFCC API Imports
var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var UUIDUtils = require('dw/util/UUIDUtils');

var CustomOrderHelpers = require(
    '*/cartridge/scripts/checkout/customOrderHelpers');

// Service Instance
var ssService = require(
    '*/cartridge/scripts/service/smartyStreetsService').getService();
// Custom Logger Instance
var ssLogger = Logger.getLogger('smartystreets', 'smartystreets');

/* Private Helper Methods
   ========================================================================== */

/**
 * Parses the returned address objects from a call to the smartystreets.http
 * service, and re-map the fields to the SFCC naming convention.
 *
 * @param {Object} address - An address object literal wich was returned from a
 *      call to the address verification service.
 * @return {{adressee: string, address1: string, address2: ?string, city: string, state: string, postalCode: string, inputIndex: number, candidateIndex: number, type: string}[]}
 *      - Returns an array of address objects.
 */
function parseReturnedAddress(address) {
    // Get site preference needed in this method.
    var site = Site.getCurrent();
    var useLongZip = site.getCustomPreferenceValue('useLongPostalCodes');

    // Set initial return values.
    var isValid = false;
    var isOriginal = !empty(address.input_id) && address.input_id === 'original';

    if (!empty(address.analysis)) {
        var analysis = address.analysis;
        // Check if a match type was returned. If one was not returned,
        // then the address will be invalid and we don't need to check the
        // footnotes.
        if (!empty(analysis.dpv_match_code)) {
            var matchCode = analysis.dpv_match_code;

            // All codes that are not 'Y' indicate an invalid address.
            if (matchCode === 'Y') {
                isValid = true;

                if (!empty(analysis.footnotes)) {
                    // Q# - Unique zip code: valid
                    // X# - Unique zip code: valid.
                    // Y# - Military zip code: valid.
                    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
                        'N', 'M', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'Z'
                    ].forEach(function (code) {
                        if (analysis.footnotes.indexOf(code) > -1) {
                            isOriginal = false;
                        }
                    });
                }
            } else {
                isValid = false;
            }
        }
    }

    // Create a JS object literal for passing the address back.
    var addObj = {
        addressee: address.addressee,
        address1: address.delivery_line_1,
        address2: address.delivery_line_2 || '',
        city: address.components.city_name,
        state: address.components.state_abbreviation,
        postalCode: address.components.zipcode,
        isValid: isValid,
        isOriginal: isOriginal,
        type: isOriginal ?
            'current' : 'suggestion',
        UUID: UUIDUtils.createUUID()
    };

    if (address.type === 'current') {
        addObj.label = Resource.msg('addressverification.current_label',
            'address_verification', null);
    } else {
        addObj.label = Resource.msg('addressverification.suggested_label',
            'address_verification', null);
    }

    // Use the site preference to check if the site is using the additional
    // 4 characters for postal codes on the return addresses for validation
    // calls.
    if (!empty(useLongZip) && useLongZip === true) {
        addObj.postalCode += '-' + address.components.plus4_code;
    }

    return addObj;
}

/* Public Exported Functions & Constructors
   ========================================================================== */

/**
 * A data model class for passing address verification data from calls to the
 * smartystreets.http address verification service back to the client.
 *
 * @constructor
 * @param {Object|dw.order.OrderAddress} addressSource - The address form that was submitted from
 *      the client browser.
 * @param {dw.system.Request} req - The request instance from the controller
 *      endpoint for getting and setting session cache variable.
 */
function addressVerification(addressSource, req) {
    // SFCC system class imports.
    var OrderAddress = require('dw/order/OrderAddress');

    // Set local variables.
    var site = Site.getCurrent();
    var isSSEnabled = site.getCustomPreferenceValue(
        'isSmartyStreetsEnabled');

    // Set instance variables.
    this.address = null;
    var allowCurrent = !CustomOrderHelpers.checkForFraudCheckProduct();
    this.allowCurrent = allowCurrent;
    this.isValid = true;
    this.suggestedAddresses = [];
    this.showModal = false;
    this.success = false;
    this.hasSuggestedAddress = false;
    this.isSSEnabled = !empty(isSSEnabled) ? isSSEnabled : false;
    this.req = req;

    // Get the UUIDs for already valid address options.
    this.validatedChoices = !empty(
        req.session.privacyCache.get('allowedAddresses')) ?
        req.session.privacyCache.get('allowedAddresses') : '';

    // Fields from the OrderAddress instance or the address form.
    if (addressSource instanceof OrderAddress) {
        this.country = addressSource.countryCode.value;
        this.getAddressFromOrderAddress();
        this.verify();
    } else {
        this.country = !empty(addressSource.country) &&
            !empty(addressSource.country.htmlValue) ?
            addressSource.country.htmlValue : '';
        this.addressForm = !empty(addressSource) ? addressSource : null;

        // Get the address object literal from the submitted form.
        if (!empty(this.addressForm)) {
            this.getAddressFromForm(addressSource);
        }
    }

    this.verify();
}

/**
 * An instance method for the AddressVerification class that makes a call to the
 * SmartyStreets address verification web service to verify that the address is
 * valid.
 */
addressVerification.prototype.verify = function () {
    // Create a reference to the instance for callback use.
    var instance = this;

    // Check if this address has already been validated.
    var paramMap = request.httpParameterMap;
    var originalFound = false;
    var uuid = !empty(paramMap.address_uuid) &&
        !empty(paramMap.address_uuid.stringValue) ?
        paramMap.address_uuid.stringValue : '';

    /*
     * If the address verification service call is not enabled, the address
     * object is not set, there is no line1 for the address (required for the
     * SmartyStreets API call), the address is not a US address (SmartyStreets
     * API that is used is for US address lookup only), OR the address has
     * already been processed THEN proceed to billing.
     */
    if (!this.isSSEnabled ||
        empty(this.address) ||
        empty(this.address.address1) ||
        empty(this.country) ||
        this.country !== 'US' ||
        (!empty(uuid) && this.validatedChoices.indexOf(uuid) > -1)
    ) {
        this.success = true;
        this.isValid = false;
        this.showModal = false;

        // Reset the session var for processed addresses.
        this.req.session.privacyCache.set('allowedAddresses', null);
    } else {
        try {
            // Make call to the web service.
            var callResponse = ssService.call(this.address);
            if (callResponse.ok && callResponse.object) {
                if (callResponse.object.empty) {
                    // If no result is returned, the address is invalid.
                    this.isValid = false;
                } else {
                    // If addresses were returned, they are parsed, and added
                    // to the suggestedAddresses array.
                    callResponse.object.toArray().forEach(
                        function (returnedAddObj) {
                            var retAdd = parseReturnedAddress(
                                returnedAddObj);

                            // If no valid address found.
                            if (!retAdd.isValid && retAdd.isOriginal) {
                                instance.isValid = false;
                            } else if (retAdd.isValid) {
                                instance.suggestedAddresses.push(retAdd);

                                if (retAdd.isOriginal) {
                                    originalFound = true;
                                }
                            }
                        }
                    );
                }

                // Set the call success flag to true.
                this.success = true;
            } else {
                var wString = 'WARN calling smartystreets.http service';

                // Check if there was an HTTP error code returned to log.
                if (!empty(callResponse.error)) {
                    wString += '\nHTTP Response: ' + callResponse.error;
                }

                // Add any error message returned to log message.
                if (!empty(callResponse.errorMessage)) {
                    wString += '\nErrMessage: ' + callResponse.errorMessage;
                }

                ssLogger.warn(wString);

                // Set as unsuccessful.
                this.success = false;
            }
        } catch (e) {
            this.success = false;
            var eString = 'ERROR calling smartystreets.http service:\n';

            // Log each key of the Error instance.
            Object.keys(e).forEach(function (key) {
                eString += key + ': ' + e[key] + '\n';
            });

            ssLogger.error(eString);
        }

        var success = this.success;
        var valid = this.isValid;

        // If there was an error in the call or the address was not validated
        // then we show a modal window for the user;
        if (!success || !valid || !originalFound) {
            this.showModal = true;

            // Check if any suggestions were returned, and set the
            // corresponding return value.
            if (this.suggestedAddresses.length) {
                this.hasSuggestedAddress = true;
            }

            if (this.allowCurrent) {
                this.address.type = 'current';
                this.address.label = Resource.msg(
                    'addressverification.current_label',
                    'address_verification', null);
                this.address.UUID = UUIDUtils.createUUID();
                this.suggestedAddresses.push(this.address);
            } else if (!this.hasSuggestedAddress) {
                // Still show the enetered address but set type as 'readonly'.
                this.address.type = 'readonly';
                this.address.label = Resource.msg(
                    'addressverification.current_label',
                    'address_verification', null);
                this.address.UUID = UUIDUtils.createUUID();
                this.suggestedAddresses.push(this.address);
            }
        }
    }
};

/**
 * Creates an object literal definition of the address from the address form
 * element that is passed as an argument, and sets the model's instance variable
 * for the address property to the new object.
 *
 * @param {dw.web.FormElement} addressForm - The address form from the request.
 */
addressVerification.prototype.getAddressFromForm = function (addressForm) {
    var addObj = {};
    ['address1', 'address2', 'city', 'state', 'postalCode', 'firstName',
        'lastName'
    ]
    .forEach(function (key) {
        if (key !== 'state') {
            if (!empty(addressForm[key])) {
                addObj[key] = addressForm[key].htmlValue;
            } else {
                addObj[key] = '';
            }
        } else {
            addObj[key] = !empty(addressForm.states.stateCode) ?
                addressForm.states.stateCode.htmlValue : '';
        }
    });

    addObj.addressee = !empty(addressForm.firstName) ?
        addressForm.firstName.htmlValue : '';

    if (!empty(addressForm.lastName)) {
        addObj.addressee += addObj.adressee !== '' ?
            ' ' + addressForm.lastName.htmlValue :
            addressForm.lastName.htmlValue;
    }

    this.address = addObj;
};

/**
 * Populates the local member variables from the OrderAddress isntance passed
 * into the constructor function as a parameter.
 *
 * @param {dw.order.OrderAddress} orderAddress - The OrderAddress from a basket
 *      shipment.
 */
addressVerification.prototype.getAddressFromOrderAddress =
    function (orderAddress) {
        var addObj = {};
        ['address1', 'address2', 'city', 'state', 'postalCode', 'firstName',
            'lastName']
        .forEach(function (key) {
            addObj[key] = key === 'state' ? orderAddress.stateCode :
                orderAddress[key];
        });

        this.address = addObj;
    };

/**
 * Returns only the fields needed for returning to the client.
 * @returns {{showModal: bool, suggested: Object[], allowCurrent: bool, enabled: bool, serviceSuccess: bool, addressValid: bool, resources: Object}}
 *      - Returns a view data object to be added to the response's JSON object.
 */
addressVerification.prototype.getViewData = function () {
    // Get the message to show the user.
    var modalMessage = '';
    if (this.showModal) {
        if (this.hasSuggestedAddress) {
            if (this.allowCurrent) {
                modalMessage = Resource.msg(
                    'addressverification.verify_edit_suggested',
                    'address_verification', null);
            } else {
                modalMessage = Resource.msg(
                    'addressverification.edit_suggested',
                    'address_verification', null);
            }
        } else if (this.allowCurrent) {
            modalMessage = Resource.msg(
                'addressverification.verify',
                'address_verification', null);
        } else {
            modalMessage = Resource.msg(
                'addressverification.please_edit',
                'address_verification', null);
        }
    }

    var viewData = {
        showModal: this.showModal,
        suggested: this.suggestedAddresses,
        allowCurrent: this.allowCurrent,
        enabled: this.isSSEnabled,
        serviceSuccess: this.success,
        addressValid: this.isValid,
        resources: {
            continue: Resource.msg('addressverification.continue',
                'address_verification', null),
            edit: Resource.msg('addressverification.edit',
                'address_verification', null),
            msg: Resource.msg('addressverification.unable_to_verify',
                'address_verification', null),
            msgDetail: modalMessage
        }
    };

    return viewData;
};

module.exports = addressVerification;
