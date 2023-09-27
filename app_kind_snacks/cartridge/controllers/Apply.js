'use strict';

/**
 * Contact.js
 * @extends app_storefront_base/cartridge/controllers/Contact.js
 *
 * Provides override and extension functionality for the base Contact controller.
 */

// SFCC system class imports
var ContentMgr = require('dw/content/ContentMgr');
var URLUtils = require('dw/web/URLUtils');

// SFRA module imports
var server = require('server');
var assets = require('*/cartridge/scripts/assets');
var cache = require('*/cartridge/scripts/middleware/cache');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');

var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');

var Logger = require('dw/system/Logger');

var LoginRadiusService = require('*/cartridge/scripts/service/loginRadiusService');

var HookMgr = require('dw/system/HookMgr');
var Mail = require('dw/net/Mail');
var Site = require("dw/system/Site");
var PageMgr = require('dw/experience/PageMgr');

/**
 * @extends Contact-Show
 *
 * Adds page metadata from the customerservice-contactus content asset.
 */
server.get('Show', consentTracking.consent, cache.applyDefaultCache, function (req, res, next) {
    var page = PageMgr.getPage("b2bapply");
    var params;
    // eslint-disable-next-line no-undef
    response.writer.print(PageMgr.renderPage(page.ID, JSON.stringify(params)));
}, pageMetaData.computedPageMetaData);

/**
 * @extends Apply-SubmitForm
 *
 * Appends a querystring param to the redirect to communicate to
 * the user that their feedback has been successfully submitted.
 */
server.post('SubmitForm', server.middleware.https, function (req, res, next) {
    var f = req.form;
    var uid;
    var id;
    var password;
    // Klaviyo
    var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoUtils');
    var KlaviyoSubscriptionUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');
    var RecaptchaService = require('~/cartridge/scripts/recaptcha/RecaptchaService');
    var Sitee = require('dw/system/Site');
    var svc = RecaptchaService.get();
    var site = require('dw/system/Site').getCurrent();
    var secret = site.getCustomPreferenceValue('recaptcha3_secret');

    var resp = svc.call({
        secret: secret,
        response: f.recpatcharesponse,
        remoteip: request.httpRemoteAddress
    });

    var score = resp.object.score;
    var passed = false;

    if (score > Sitee.current.getCustomPreferenceValue("recaptcha3_score")) {
        passed = true;
    } else {
        passed = false;
    }

    if (passed) {
        if (empty(f.profuid)) {
            var p = f.password;
            var results = LoginRadiusService.registerUser(f.email, p, f.firstName, f.lastname);
            uid = results.Uid;
            id = results.ID;
            password = Math.random()
                .toString(36)
                .slice(-16);
            password += "11$";
        } else {
            uid = f.profuid;
            id = f.profid;
            password = Math.random()
                .toString(36)
                .slice(-16);
            password += "11$";
        }

        var customer = CustomerMgr.getCustomerByLogin(uid);

        Transaction.wrap(function () {
            if (!customer) {
                customer = CustomerMgr.createCustomer(uid, password);
            }

            Object.keys(f)
                .forEach(function (e) {
                    if (f[e] === "undefined") {
                        f[e] = "";
                    }
                });

            var authStatus = CustomerMgr.authenticateCustomer(uid,
                password);
            CustomerMgr.loginCustomer(authStatus, false);
            if (typeof f.hearaboutus_other == "undefined") { // eslint-disable-line
                f.hearaboutus_other = "";
            }
            if (typeof f.businesstype_other == "undefined") { // eslint-disable-line
                f.businesstype_other = "";
            }
            if (typeof f.businessaddress2 == "undefined") { // eslint-disable-line
                f.businessaddress2 = "";
            }
            customer.profile.firstName = f.firstName;
            customer.profile.lastName = f.lastname;
            customer.profile.email = f.email;
            customer.profile.phoneBusiness = f.phone;
            customer.profile.companyName = f.businessname;
            customer.profile.custom.companyType = f.businesstype;
            customer.profile.custom.companyTypeOther = f.businesstype_other;
            customer.profile.custom.distributor = (f.distributor === 1);
            customer.profile.custom.website = f.businesswebsite;
            customer.profile.custom.hearaboutus = f.hearaboutus;
            customer.profile.custom.hearaboutus_other = f.hearaboutus_other;
            customer.profile.custom.region = f.distributor_region;

            customer.profile.custom.spending_other = f.spending_other;
            if (f.businesstype_other_other !== "") {
                customer.profile.custom.spending_other = f.businesstype_other_other;
            }
            customer.profile.custom.spending = f.spending === "yes";

            customer.profile.custom.loginradius_id = id;
            customer.profile.custom.loginradius_uid = uid;

            if (typeof f.utm_source == "undefined") { // eslint-disable-line
                f.utm_source = "";
            }
            if (typeof f.utm_medium == "undefined") { // eslint-disable-line
                f.utm_medium = "";
            }
            if (typeof f.utm_campaign == "undefined") { // eslint-disable-line
                f.utm_campaign = "";
            }
            customer.profile.custom.utm_source = f.utm_source;
            customer.profile.custom.utm_medium = f.utm_medium;
            customer.profile.custom.utm_campaign = f.utm_campaign;
            // customer.profile.custom.resell = f.resell;
            customer.profile.custom.comments = f.comments;

            var abook = customer.profile.getAddressBook();
            var ad = abook.createAddress("Business Address #" + abook.addresses.length + 1);
            ad.address1 = f.businessaddress;
            ad.address2 = f.businessaddress2;
            ad.city = f.businesscity;
            ad.companyName = f.businessname;
            ad.countryCode = "US";
            ad.firstName = f.firstName;
            ad.lastName = f.lastname;
            ad.phone = f.phone;
            ad.postalCode = f.businesszip;
            ad.stateCode = f.businessstate;
            ad.custom.email = f.email;

            if (customer.profile.custom.b2bstatus != "wholesale") { // eslint-disable-line
                customer.profile.custom.b2bstatus = "pending";
                customer.profile.custom.emailed = false;
            }
        });
        if (f.subtonewsletter) {
            if (site.getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
                KlaviyoSubscriptionUtils.subscribeToList(f.email, 'wholesale.submitted');
            } else {
                var hookID = 'app.mailingList.subscribe';
                if (HookMgr.hasHook(hookID)) {
                    HookMgr.callHook(
                        hookID,
                        'subscribe',
                        {
                            email: f.email
                        }
                    );
                }
            }
        }
        delete f.password;
        delete f.currentPassword;
        delete f.confirmpassword;
        delete f.profuid;
        delete f.profid;

        var contactEmail = new Mail();
        contactEmail.addTo(Site.current.getCustomPreferenceValue("b2bapplyemail"));
        contactEmail.setSubject("B2B New Application Submitted");
        contactEmail.setFrom("ksdev@kindsnacks.com");
        var mimeType = 'text/html';
        var encoding = 'UTF-8';
        var cont = JSON.stringify(f, 2);
        contactEmail.setContent(cont, mimeType, encoding);
        contactEmail.send();

        var mailhook = 'app.mail.sendMail';
        // Klaviyo
        if (site.getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
            KlaviyoUtils.sendEmail(f.email, {}, 'wholesale.submitted');
        }
        if (HookMgr.hasHook(mailhook)) {
            HookMgr.callHook(
                mailhook,
                'sendMail',
                {
                    communicationHookID: 'wholesale.submitted',
                    template: 'checkout/confirmation/confirmationEmail',
                    fromEmail: "hi@kindsnacks.com",
                    toEmail: f.email,
                    subject: "Test email",
                    messageBody: "",
                    params: null
                }
            );
        }
        res.redirect(URLUtils.url('Apply-Show', 'success', "1"));
    } else {
        res.redirect(URLUtils.url('Apply-Show', 'success', "0"));
    }

    next();
});

/**
 * @extends Contact-FaqContactForm
 *
 *
 */
server.get('GetContactForm', function (req, res, next) {
    var ContentModel = require('*/cartridge/models/content');
    var viewData = res.getViewData();

    var apiContent = ContentMgr.getContent(req.querystring.cid);

    var formId = req.querystring.formId || 'contact';
    var formTemplate = req.querystring.formTemplate || 'contact/faqContactForm.isml';

    var LoginRadius = require('*/cartridge/models/loginRadius');

    // Get the view data object to append data to.
    var loginRadius = new LoginRadius();
    var lrForwardURL = URLUtils.https('Account-Show');

    // If LoginRadius is enabled, add the JS resource for LR, and add API key to
    // the view data object.
    if (loginRadius.enabled) {
        assets.addJs(loginRadius.src);
    }

    if (!empty(req.querystring.lrforwardurl)) {
        lrForwardURL = decodeURI(req.querystring.lrforwardurl);
    }

    viewData.loginRadius = loginRadius;
    viewData.loginRadiusForwardingURL = lrForwardURL;
    res.setViewData(viewData);

    if (apiContent) {
        var content = new ContentModel(apiContent, 'content/contentAsset');

        if (content.template) {
            server.forms.getForm(formId).clear();
            res.render(formTemplate, {
                content: content,
                forms: {
                    contactForm: server.forms.getForm(formId)
                },
                success: req.querystring.success
            });
        } else {
            Logger.warn('Content asset with ID {0} is offline', req.querystring.cid);
            res.render('/components/content/offlineContent');
        }
    } else {
        Logger.warn('Content asset with ID {0} was included but not found', req.querystring.cid);
    }

    next();
});

module.exports = server.exports();
