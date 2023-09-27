'use strict';
var customerMgr = require("dw/customer/CustomerMgr");
var HookMgr = require('dw/system/HookMgr');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var log = Logger.getLogger("wholesalejob", "job");

function sendEmail() {
    var hookID = 'app.mail.sendMail';
    var clist = customerMgr.searchProfiles("custom.emailed = false", null).asList().toArray();
    // Klaviyo
    var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoUtils');

    clist.forEach(function (c) {
        var email = c.getEmail();
        var status = c.custom.b2bstatus;
        if (status == "wholesale") { // eslint-disable-line
            log.info("Approved to " + email);
            if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
                KlaviyoUtils.sendEmail(email, {}, 'wholesale.approved');
                Transaction.wrap(function () {
                    c.custom.emailed = true;
                });
            }
            if (HookMgr.hasHook(hookID)) {
                HookMgr.callHook(
                    hookID,
                    'sendMail',
                    {
                        communicationHookID: 'wholesale.approved',
                        template: 'checkout/confirmation/confirmationEmail',
                        fromEmail: "hi@kindsnacks.com",
                        toEmail: email,
                        subject: "Test email",
                        messageBody: "",
                        params: null
                    }
                );
                Transaction.wrap(function () {
                    c.custom.emailed = true;
                });
            }
        } else if (status == "denied") { // eslint-disable-line
            log.info("Denied to " + email);
            if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
                KlaviyoUtils.sendEmail(email, {}, 'wholesale.denied');
                Transaction.wrap(function () {
                    c.custom.emailed = true;
                });
            }
            if (HookMgr.hasHook(hookID)) {
                HookMgr.callHook(
                    hookID,
                    'sendMail',
                    {
                        communicationHookID: 'wholesale.denied',
                        template: 'checkout/confirmation/confirmationEmail',
                        fromEmail: "hi@kindsnacks.com",
                        toEmail: email,
                        subject: "Test email",
                        messageBody: "",
                        params: null
                    }
                );
                Transaction.wrap(function () {
                    c.custom.emailed = true;
                });
            }
        }
    });
}

exports.sendEmail = sendEmail;
