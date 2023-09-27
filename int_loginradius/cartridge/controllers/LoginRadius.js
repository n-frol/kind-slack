/* global empty, request */

'use strict';

// SFCC API includes
var CustomerMgr = require('dw/customer/CustomerMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var HookMgr = require('dw/system/HookMgr');
var PriceBookMgr = require('dw/catalog/PriceBookMgr');
var ArrayList = require('dw/util/ArrayList');

// SFRA Modules
var assets = require('*/cartridge/scripts/assets');
var collections = require('*/cartridge/scripts/util/collections');
var server = require('server');

// LoginRadius Includes.
var LoginRadiusService = require(
    '~/cartridge/scripts/service/loginRadiusService');
var LoginRadiusHelper = require(
    '~/cartridge/scripts/loginRadiusHelper');

/**
 * Updates the SFCC-internal fields with fields sent over from LoginRadius
 * @param {dw.customer.Customer} customer - Customer to update
 * @param {Object} profile - The customer's LoginRadius profile returned from
 *      the webservice call to the LoginRadius API.
 * @returns {void}
 */
function updateCustomerInfo(customer, profile) {
    customer.profile.email = profile.Email[0].Value;

    if (!empty(profile.FirstName)) {
        customer.profile.firstName = profile.FirstName;
    }

    if (!empty(profile.LastName)) {
        customer.profile.lastName = profile.LastName;
    }

    customer.profile.custom.loginradius_id = profile.ID;
    customer.profile.custom.loginradius_uid = profile.Uid;

    // Yotpo customer create/update hook
    if (HookMgr.hasHook('app.kind.yotpo.loyalty.customerCreateUpdate')) {
        HookMgr.callHook(
            'app.kind.yotpo.loyalty.customerCreateUpdate',
            'CreateUpdate', {
                id: customer.profile.customerNo,
                email: customer.profile.email,
                first_name: customer.profile.firstName,
                last_name: customer.profile.lastName
            });
    }
}

/**
 *
 * Renders a modal with a new password form. This is invoked when a user clicks
 * the 'reset password' link in the forgot-password email.
 *
 */
server.get('PasswordResetForm',
    server.middleware.https,
    function (req, res, next) {
        var LoginRadius = require('*/cartridge/models/loginRadius');
        var viewData = res.getViewData();
        var loginRadius = new LoginRadius();

        // Check that the pref is set and LoginRadius is enabled.
        if (empty(loginRadius.enabled) || !loginRadius.enabled) {
            // If LoginRadius is not enabled redirect to the login page.
            res.redirect(URLUtils.url('Login-Show'));
        }

        // Add the needed JS assets.
        assets.addJs(loginRadius.src);
        assets.addJs('/js/profile.js');

        // Set the view data for LoginRadius.
        viewData.loginRadius = loginRadius;
        viewData.loginRadius.successUrl = URLUtils.url('LoginRadius-PasswordResetSuccess');

        // Clear the new password form before rendering it.
        var passwordForm = server.forms.getForm('newPasswords');
        passwordForm.clear();
        viewData.passwordForm = passwordForm;

        res.render('/account/password/newPassword', viewData);
        return next();
    }
);

/**
 *
 * Pulls LR profile via API based on access token. If successful, verifies the
 * email address through the LR API, Logs the user in, and updates their SFCC
 * profile.
 *
 */
server.post('Start', server.middleware.https, function (req, res, next) {
    var response = JSON.parse(request.httpParameterMap.response);
    var aToken = !empty(response.access_token) ? response.access_token : null;
    var isNewsletterSignup = false;
    var profile;

    if (!empty(response.Profile) &&
    !empty(response.Profile.CustomFields) &&
    !empty(response.Profile.CustomFields.newsletter_signup) &&
    response.Profile.CustomFields.newsletter_signup === 'true'
    ) {
        isNewsletterSignup = true;
    }

    var profileEmail = !empty(response.Profile) && !empty(response.Profile.Email) ?
    response.Profile.Email : {};

    // Store the tokens to the user's session.
    req.session.privacyCache.set('accessToken', aToken);

    // get the LR profile with the token returned
    var profileLookupResult = LoginRadiusHelper.getLoginRadiusProfile(aToken);

    // If no profile is found send back an error message.
    if (!empty(profileLookupResult.ErrorCode) ||
    empty(profileLookupResult.profile) ||
    !empty(profileLookupResult.profile.ErrorCode)
    ) {
        res.json({
            success: false,
            status: 'ERROR',
            message: Resource.msg('loginradius.error.unexpectederror',
                'loginradius', null)
        });
        return next();
    }

    // Get the profile object from the response.
    profile = profileLookupResult.profile;
    var UID = profile.Uid;

    // Generate random password
    var password = Math.random().toString(36).slice(-16);

    // Get remember me flag
    var rememberMe = empty(response.remember_me) ? false : response.remember_me;
    var customer = CustomerMgr.getCustomerByLogin(UID);

    // If customer is null, create customer
    Transaction.wrap(function () {
        if (empty(customer)) {
            customer = CustomerMgr.createCustomer(UID, password);
            // Store the new account creation information in session to use analytic
            // reporting information.
            req.session.privacyCache.set('registration', 'submitted');
        }
        var token = customer.profile.credentials.createResetPasswordToken();
        customer.profile.credentials.setPasswordWithToken(token, password);
        var authStatus = CustomerMgr.authenticateCustomer(UID,
        password);
        updateCustomerInfo(customer, profile);
        CustomerMgr.loginCustomer(authStatus, rememberMe);
    });

    // If the customer selects to sign-up for the newsletter, then enroll using
    // the mail list subscribe hook.
    if (isNewsletterSignup && profileEmail.length) {
    // Get the primary email address.
        var primaryEmail = '';
        profileEmail.forEach(function (email) {
            if (email.Type === 'Primary') {
                primaryEmail = email.Value;
            }
        });

        // Subscribe the customer to the mailing list.
        if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
            const hookID = 'app.klaviyo.mailingList.subscribe';
            if (HookMgr.hasHook(hookID) && primaryEmail) {
                let hookResult = HookMgr.callHook(
                    hookID,
                    'subscribeToList',
                    {
                        action: "accountCreate",
                        email: primaryEmail,
                        first_name: customer.profile.firstName,
                        last_name: customer.profile.lastName,
                        source: "Registration Form"
                    });
                if (hookResult) {
                    if (HookMgr.hasHook('app.kind.yotpo.loyalty.newsletter')) {
                        HookMgr.callHook('app.kind.yotpo.loyalty.newsletter', 'newsletter', primaryEmail);
                    }
                }
            }
        }
    }

    // Custom price book assignment to customer
    collections.forEach(customer.getCustomerGroups(), function (group) {
        var isGroupHasPriceBooks = Object.hasOwnProperty.call(group.getCustom(), 'priceBooks');
        if (isGroupHasPriceBooks) {
            var priceBooks = group.custom.priceBooks;
            if (priceBooks) {
                var sitePriceBooks = new ArrayList();
                priceBooks.forEach(function (bookId) {
                    var priceBook = PriceBookMgr.getPriceBook(bookId);
                    if (priceBook) {
                        sitePriceBooks.add(priceBook);
                    }
                });
                PriceBookMgr.setApplicablePriceBooks(sitePriceBooks.toArray());
            }
        }
    });
    res.json({
        status: 'OK'
    });
    return next();
});

/**
 *
 * Pulls LR profile via API based on access token. If successful, updates their SFCC profile.
 *
 */
server.post('UpdateProfile', server.middleware.https, function (req, res, next) {
    var response = JSON.parse(request.httpParameterMap.response);

    // get the LR profile with the token returned
    var profileResult = LoginRadiusHelper.getLoginRadiusProfile(response.access_token);
    if (empty(profileResult) || !profileResult.success ||
        empty(profileResult.profile)
    ) {
        res.json({
            status: 'ERROR',
            message: Resource.msg('loginradius.error.unexpectederror',
                'loginradius', null)
        });
        return next();
    }

    var profile = profileResult.profile;
    var UID = profile.Uid;

    var customer = CustomerMgr.getCustomerByLogin(UID);
    if (empty(customer)) {
        res.json({
            status: 'ERROR',
            message: Resource.msg('loginradius.error.unexpectederror',
                'loginradius', null)
        });
        return next();
    }

    Transaction.wrap(function () {
        updateCustomerInfo(customer, profile);
    });

    res.json({
        status: 'OK'
    });
    return next();
});

/**
 *
 * Generates a Secure One Time Token (SOTT) via the LoginRadius API
 *
 */
server.get('GenerateSott', server.middleware.https, function (req, res, next) {
    var sottRes = LoginRadiusService.generateSott();
    res.json(sottRes);
    return next();
});

/**
 * Returns a template for display of a modal window indicating that a password
 * change was completed successfully.
 *
 * - Required HTTP Parameters:
 * @param {string} access_token - The access token stored as LRTokenKey in the
 *      browser's local storage.
 */
server.get('PasswordResetSuccess',
    server.middleware.https,
    function (req, res, next) {
        var LoginRadius = require('*/cartridge/models/loginRadius');
        var paramMap = request.httpParameterMap;
        var accessToken = !empty(paramMap.access_token) &&
            !empty(paramMap.access_token.value) ?
            paramMap.access_token.value : '';

        // After a password reset, the email address is marked as 'verified'.
        // User's cannot change their email address once it has been verified,
        // so we need to reverse this flag.
        LoginRadiusHelper.unverifyAccount(accessToken);

        // Even if the unverify call threw an error, we still want to display
        // the password reset success messaging because the user's password has
        // now been changed and they will need to know to use the new one.
        var viewData = res.getViewData();
        viewData.loginRadius = new LoginRadius();
        res.render('/account/password/passwordResetSuccessModal', viewData);
        return next();
    }
);

server.post('UnverifyAccount',
    server.middleware.https,
    function (req, res, next) {
        var paramMap = request.httpParameterMap;
        var accessToken = !empty(paramMap.access_token) &&
            !empty(paramMap.access_token.value) ?
            paramMap.access_token.value : '';

        var unverifyAccountResult = LoginRadiusHelper.unverifyAccount(accessToken);
        res.json(unverifyAccountResult);
        return next();
    }
);

/**
 *
 * Refreshes expired access token
 *
 */
server.get('RefreshToken', server.middleware.https, function (req, res, next) {
    var refreshResult = {};
    var aToken = !empty(req.querystring.access_token) ?
        req.querystring.access_token : '';
    var rToken = !empty(req.querystring.refresh_token) ?
        req.querystring.refresh_token : '';

    if (!empty(aToken)) {
        refreshResult = LoginRadiusHelper.refreshAccessToken(aToken, rToken);
    } else {
        // Log the error and get an 'unspecified error occured' message to
        // display for the user.
        refreshResult = LoginRadiusHelper.getUnexpectedError({
            errMsg: 'ERROR: No access token included in RefreshToken request.',
            queryString: req.querystring
        });
    }

    res.json(refreshResult);
    return next();
});

module.exports = server.exports();
