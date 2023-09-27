'use strict';

/**
 * Address.js
 * @extends app_storefront_base/cartridge/controllers/Address.js
 *
 * Extends the base behavior of the app_storefront_base Address.js controller
 * endpoints.
 */

// SFCC system class imports
var ContentMgr = require('dw/content/ContentMgr');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');

// SFCC module imports
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

// Since users can't type in an ID, create one dynamically for now addresses
function determineUniqueAddressID(city, currentAddressID, addressBook) {
    var maxIDLength = 20;
    var counter = 0;
    var existingAddress = null;
    var currentAddress = null;

    if (city === null || empty(city)) {
        return null;
    }

    if (currentAddressID) {
        currentAddress = addressBook.getAddress(currentAddressID);
    }

    if (currentAddress && currentAddress.city === city) {
        return currentAddressID;
    }

    var candidateID = city.substring(0, 20);

    while (existingAddress === null) {
        existingAddress = addressBook.getAddress(candidateID);
        if (existingAddress !== null) {
            counter++;
            candidateID = city.substring(0, maxIDLength - ('-' + counter).length) + '-' + counter;
            existingAddress = null;
        } else {
            return candidateID;
        }
    }

    return null;
}

// SFRA Includes
var server = require('server');

server.extend(module.superModule);

/**
 * Sets the metadata for the page to be rendered from the specified content
 * asset.
 *
 * @param {Object} req - The request object wrapper.
 * @param {Function} next - The next function in the middleware chain.
 * @param {string} assetName - The name of the content asset.
 */
function setResponseMeta(req, next, assetName) {
    var contentAsset = ContentMgr.getContent('myaccount-' + assetName);
    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }
    next();
}

/**
 * @extends Address-List
 *
 * Adds page metadata to the Address-List webpage.
 */
server.append('List', function (req, res, next) {
    setResponseMeta(req, next, 'addresses');
}, pageMetaData.computedPageMetaData);

/**
 * @extends Address-EditAddress
 *
 * Adds page metadata to the Address-EditAddress web page.
 */
server.append('EditAddress', function (req, res, next) {
    setResponseMeta(req, next, 'personaldata');
}, pageMetaData.computedPageMetaData);

/**
 * @extends Address-AddAddress
 *
 * Adds page metadata to the Address-AddAddress web page.
 */
server.append('AddAddress', function (req, res, next) {
    setResponseMeta(req, next, 'personaldata');
}, pageMetaData.computedPageMetaData);

/**
 * @override
 * Replacement for the app_sotrefront_base endpoint Address-SaveAddress.
 */
server.replace('SaveAddress', server.middleware.post, function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var formErrors = require('*/cartridge/scripts/formErrors');

    var addressForm = server.forms.getForm('address');
    var addressFormObj = addressForm.toObject();
    addressFormObj.addressForm = addressForm;
    var customer = CustomerMgr.getCustomerByCustomerNumber(
        req.currentCustomer.profile.customerNo
    );
    var addressBook = customer.getProfile().getAddressBook();
    if (addressForm.valid) {
        res.setViewData(addressFormObj);

        var viewData = res.getViewData();

        // Set address ID using the addressId param or create a new one as appropriate
        var address = req.querystring.addressId ? addressBook.getAddress(req.querystring.addressId) : null;
        var addressId;

        if (address) {
            addressId = addressFormObj.addressId || req.querystring.addressId; // address can only be truthy if req.querystring.addressId is set, so we can use it
        } else {
            addressId = determineUniqueAddressID(viewData.city || '', null, addressBook);
        }

        viewData.addressId = addressId;

        res.setViewData(viewData);

        this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
            var formInfo = res.getViewData();

            Transaction.wrap(function () {
                var address = req.querystring.addressId // eslint-disable-line no-shadow
                    ? addressBook.getAddress(req.querystring.addressId)
                    : addressBook.createAddress(formInfo.addressId);
                if (address) {
                    if (req.querystring.addressId) {
                        // Don't try and update ID if it's not changing, will cause error
                        if (req.querystring.addressId !== formInfo.addressId) {
                            if (empty(addressBook.getAddress(formInfo.addressId))) {
                                address.setID(formInfo.addressId);
                            } else {
                                res.json({
                                    success: false,
                                    addressFormObj: addressFormObj,
                                    fields: {
                                        dwfrm_address_addressId: Resource.msg('field.general.addressId.alreadyexists', 'address', null) + ' ' + formInfo.addressId + ' ' + req.querystring.addressId
                                    }
                                });

                                return;
                            }
                        }
                    }

                    address.setAddress1(formInfo.address1 || '');
                    address.setAddress2(formInfo.address2 || '');
                    address.setCity(formInfo.city || '');
                    address.setFirstName(formInfo.firstName || '');
                    address.setLastName(formInfo.lastName || '');
                    address.setPhone(formInfo.phone || '');
                    address.setPostalCode(formInfo.postalCode || '');

                    if (formInfo.states && formInfo.states.stateCode) {
                        address.setStateCode(formInfo.states.stateCode);
                    }

                    if (formInfo.country) {
                        address.setCountryCode(formInfo.country);
                    }

                    address.setJobTitle(formInfo.jobTitle || '');
                    address.setPostBox(formInfo.postBox || '');
                    address.setSalutation(formInfo.salutation || '');
                    address.setSecondName(formInfo.secondName || '');
                    address.setCompanyName(formInfo.companyName || '');
                    address.setSuffix(formInfo.suffix || '');
                    address.setSuite(formInfo.suite || '');
                    address.setJobTitle(formInfo.title || '');
                    address.custom.email = formInfo.email || '';

                    res.json({
                        success: true,
                        redirectUrl: URLUtils.url('Address-List').toString()
                    });
                } else {
                    formInfo.addressForm.valid = false;
                    formInfo.addressForm.addressId.valid = false;
                    formInfo.addressForm.addressId.error =
                        Resource.msg('error.message.idalreadyexists', 'forms', null);
                    res.json({
                        success: false,
                        fields: formErrors(addressForm)
                    });
                }
            });
        });
    } else {
        res.json({
            success: false,
            fields: formErrors.getFormErrors(addressForm)
        });
    }

    return next();
});

/**
 * Address-DeleteAddress : Delete an existing address
 * @name Base/Address-DeleteAddress
 * @function
 * @memberof Address
 * @param {middleware} - userLoggedIn.validateLoggedInAjax
 * @param {querystringparameter} - addressId - a string used to identify the address record
 * @param {querystringparameter} - isDefault - true if this is the default address. false otherwise
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.replace('DeleteAddress', userLoggedIn.validateLoggedInAjax, function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');

    var data = res.getViewData();
    if (data && !data.loggedin) {
        res.json();
        return next();
    }

    var addressId = req.querystring.addressId;
    var isDefault = req.querystring.isDefault;
    var customer = CustomerMgr.getCustomerByCustomerNumber(
        req.currentCustomer.profile.customerNo
    );

    var addressBook = customer.getProfile().getAddressBook();
    var length = addressBook.getAddresses().length;

    if (isDefault && length === 1) {
        res.json({
            error: true,
            message: "Your profile must include a default address. To modify addresses, click Edit."
        });
        return next();
    }

    var address = addressBook.getAddress(addressId);
    var UUID = address.getUUID();
    this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
        Transaction.wrap(function () {
            addressBook.removeAddress(address);
            if (isDefault && length > 0) {
                var newDefaultAddress = addressBook.getAddresses()[0];
                addressBook.setPreferredAddress(newDefaultAddress);
            }
        });

        // Send account edited email
        accountHelpers.sendAccountEditedEmail(customer.profile);

        if (length === 0) {
            res.json({
                UUID: UUID,
                defaultMsg: Resource.msg('label.addressbook.defaultaddress', 'account', null),
                message: Resource.msg('msg.no.saved.addresses', 'address', null)
            });
        } else {
            res.json({ UUID: UUID,
                defaultMsg: Resource.msg('label.addressbook.defaultaddress', 'account', null)
            });
        }
    });
    return next();
});

module.exports = server.exports();
