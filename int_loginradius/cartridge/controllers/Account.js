/* global empty, session */

'use strict';

/**
 * Account.js
 * LoginRadius-specific appends/prepends for the default app_storefront_base
 * Account.js controller.
 */

// SFRA Includes
var LoginRadiusService = require('~/cartridge/scripts/service/loginRadiusService');
var server = require('server');
var assets = require('*/cartridge/scripts/assets');
var Site = require('dw/system/Site');

server.extend(module.superModule);

var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var ProductMgr = require('dw/catalog/ProductMgr');


/**
 * Takes the profile returned by the LoginrRadius API and returns it in a format
 * suitable for displaying via SFRA's view system.
 *
 * @param {Object} profile - The customer's LoginRadius profile.
 * @returns {{FirstName: string, LastName: string, Email: string}} - Returns the
 *      LoginRadius profile information that is needed as an abbreviated Object.
 */
function formatLoginRadiusProfile(profile) {
    // pull out the primary email from the list sent over by LoginRadius
    var primaryEmail;
    for (var i = 0; i < profile.Email.length; i++) {
        if (!empty(profile.Email[i].Type) && !empty(profile.Email[i].Value) &&
            (profile.Email[i].Type === 'Primary')
        ) {
            primaryEmail = profile.Email[i].Value;
            break;
        }
    }

    // return the fields editable in the profile section
    return {
        FirstName: profile.FirstName,
        LastName: profile.LastName,
        Email: primaryEmail
    };
}

/**
 * Prepend callback to initialize response with prefs, assets and view data.
 *
 * @param {Object} req - The request
 * @param {Object} res - The response
 * @param {function} next - A callback function to pass control to the next
 *      middleware function in the chain.
 *
 * @returns {null} - Returns the return value of the next() callback, wich
 *      evaluates as null.
 */
function initializeLoginRadius(req, res, next) {
    var LoginRadius = require('*/cartridge/models/loginRadius');
    // Get the view data object to append data to.
    var viewData = res.getViewData();
    var loginRadius = new LoginRadius();
    viewData.loginRadius = loginRadius;

    // If LoginRadius is enabled, add the JS resource for LR, fetch the LR
    // profile, and pass it as part of the view data.
    if (loginRadius.enabled) {
        assets.addJs(loginRadius.src);
        var UID = session.customer.profile.credentials.login;
        var profile = LoginRadiusService.getProfileByUID(UID);
        viewData.loginRadiusProfile = formatLoginRadiusProfile(profile);
    }

    res.setViewData(viewData);
    return next();
}

/**
 * Prepends SFRA's Account-EditProfile controller handler to include the user's profile
 * (if logged in and LoginRadius is enabled).
 */
server.prepend('EditProfile', initializeLoginRadius);


/**
 * Prepends SFRA's Account-EditProfile controller handler to include the user's profile
 * (if logged in and LoginRadius is enabled).
 */
server.prepend('EditPassword', initializeLoginRadius);

function responsiveSliderImages(pid) {
    var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');
    var product = ProductMgr.getProduct(pid);
    var images;
    if (!empty(product) && !empty(product.getImages('large'))) {
        images = product.getImages('large').toArray();
    }
    var responsiveImages = [];

    if (!empty(images)) {
        images.forEach(function (image) {
            responsiveImages.push(responsiveImageUtils.getResponsiveImage(image, 475, 950, '', 'png'));
        });
    }

    return responsiveImages;
}

/**
 * Account-Show : The Account-Show endpoint will render the shopper's account page. Once a shopper logs in they will see is a dashboard that displays profile, address, payment and order information.
 * @name Base/Account-Show
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - userLoggedIn.validateLoggedIn
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - registration - A flag determining whether or not this is a newly registered account
 * @param {category} - senstive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.replace(
    'Show',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Resource = require('dw/web/Resource');
        var URLUtils = require('dw/web/URLUtils');
        var accountHelpers = require('*/cartridge/scripts/account/accountHelpers');
        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        var reportingURLs;

        // Get reporting event Account Open url
        if (req.session.privacyCache.get('registration') && req.session.privacyCache.get('registration') === 'submitted') {
            reportingURLs = reportingUrlsHelper.getAccountOpenReportingURLs(
                CustomerMgr.registeredCustomerCount
            );
        }

        var accountModel = accountHelpers.getAccountModel(req);

        var cc = req.currentCustomer;
        var swapbar = cc.raw.profile.custom.swapbar;
        if (!swapbar) {
            var swapids = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementItems');
            var swapbarid = swapids[0];
            swapbar = swapbarid;
        }
        var swapprod = ProductMgr.getProduct(swapbar.toString());
        var images = responsiveSliderImages(swapbar);

        res.render('account/accountDashboard', {
            images: images,
            account: accountModel,
            swapbar: swapprod,
            accountlanding: true,
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                }
            ],
            reportingURLs: reportingURLs
        });
        next();
    }
);

module.exports = server.exports();

