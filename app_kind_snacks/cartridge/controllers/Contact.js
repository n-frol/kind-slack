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
var contactHelpers = require('*/cartridge/scripts/contactHelpers');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');

var contactFields = {
    contact: [
        'subject',
        'fullName',
        'company',
        'email',
        'phone',
        'address1',
        'city',
        'stateCode',
        'postalCode',
        'country',
        'upc',
        'orderNumber',
        'product',
        'batchCode',
        'bestByDate',
        'purchaseDate',
        'storeName',
        'storeAddress',
        'comments'
    ],
    donations: [
        'fullName',
        'email',
        'phone',
        'company',
        'field501c3',
        'address1',
        'city',
        'stateCode',
        'postalCode',
        'country',
        'event-name',
        'event-date',
        'event-city',
        'event-postalCode',
        'event-stateCode',
        'description',
        'website',
        'ageRange',
        'headcount',
        'productRequest',
        'distribution',
        'rightFit',
        'kindnessOpportunities',
        'exclusivity',
        'pastSponsorship'
    ]
}; // Array of fields actually being used by the contact form

/**
 * @extends Contact-Show
 *
 * Adds page metadata from the customerservice-contactus content asset.
 */
server.get('Show', consentTracking.consent, cache.applyDefaultCache, function (req, res, next) {
    var contentAsset = ContentMgr.getContent('customerservice-contactus');
    pageMetaHelper.setPageMetaTags(req.pageMetaData, contentAsset);
    assets.addJs('/js/contact.js');
    res.render('/contact/contact');
    next();
}, pageMetaData.computedPageMetaData);

/**
 * @extends Contact-SubmitForm
 *
 * Appends a querystring param to the redirect to communicate to
 * the user that their feedback has been successfully submitted.
 */
server.get('SubmitForm', consentTracking.consent, cache.applyDefaultCache, function (req, res, next) {
    var successParam;

    var RecaptchaService = require('~/cartridge/scripts/recaptcha/RecaptchaService');
    var Sitee = require('dw/system/Site');
    var svc = RecaptchaService.get();
    var site = require('dw/system/Site').getCurrent();
    var secret = site.getCustomPreferenceValue('recaptcha3_secret');
    var params = req.querystring;
    var Logger = require('dw/system/Logger');

    var resp = svc.call({
        secret: secret,
        response: params.recpatcharesponse,
        remoteip: request.httpRemoteAddress
    });

    var score = resp.object.score;
    var passed = false;

    if (score > Sitee.current.getCustomPreferenceValue("recaptcha3_score")) {
        passed = true;
    } else {
        passed = false;
    }

    if (passed === true) {
        var viewData = res.getViewData();
        var reCaptchaForms = viewData.reCaptchaForms; // Array of forms that need to use reCaptcha.  Exported to viewdata so it can be modified and/or used elsewhere
        if (reCaptchaForms) {
            if (reCaptchaForms.indexOf('contact') === -1) {
                reCaptchaForms.push('contact');
            }
        } else {
            reCaptchaForms = ['contact'];
        }

        res.setViewData(viewData);

        var formId = !empty(params.formid) ? params.formid : 'contact';
        var form = server.forms.getForm(formId);

        var fieldsToSend = contactFields[formId] || null;

        if (formId === 'donations') {
            contactHelpers.sendConfirmationEmail(form);
        } else {
            contactHelpers.sendContactEmail(form, null, fieldsToSend);
        }
        successParam = 'true';
        Logger.debug("Contact Form bot detection :" + score);
        Logger.debug("Contact Form bot detection formdata :" + params);
        res.redirect(URLUtils.url('Page-Show', 'cid', params.cid, 'success', successParam));
    } else {
        successParam = 'false';
        Logger.error("Contact Form bot detection :" + score);
        Logger.error("Contact Form bot detection formdata :" + params);

        res.redirect(URLUtils.url('Page-Show', 'cid', params.cid, 'success', successParam));
    }
    next();
});

/**
 * @extends Contact-FaqContactForm
 *
 *
 */
server.get('GetContactForm', function (req, res, next) {
    var Logger = require('dw/system/Logger');
    var ContentModel = require('*/cartridge/models/content');

    var apiContent = ContentMgr.getContent(req.querystring.cid);

    var formId = req.querystring.formId || 'contact';
    var formTemplate = req.querystring.formTemplate || 'contact/faqContactForm.isml';

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
