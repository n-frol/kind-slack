'use strict';

var guard = require('~/cartridge/scripts/guard');
var Site = require('dw/system/Site');
/**
 * ChangeUp dashboard calls.
 */
 function dashboard() {
     require('dw/template/ISML').renderTemplate('/dashboard/dashboard', {
         config: require('*/cartridge/models/config').getConfig()
     });
 }

 function dashboardv2() {
   var ContentMgr = require('dw/content/ContentMgr');
   var pages = {
     'changeup-donation-confirmation-merchant': ContentMgr.getContent("changeup-donation-confirmation-merchant"),
     'changeup-donation-confirmation-customer': ContentMgr.getContent("changeup-donation-confirmation-customer"),
     'changeup-donation-confirmation-match': ContentMgr.getContent("changeup-donation-confirmation-match"),
     'changeup-donation-submessage-merchant': ContentMgr.getContent("changeup-donation-submessage-merchant"),
     'changeup-donation-submessage-customer': ContentMgr.getContent("changeup-donation-submessage-customer"),
     'changeup-donation-submessage-match': ContentMgr.getContent("changeup-donation-submessage-match"),
     'changeup-charity-selector-header': ContentMgr.getContent("changeup-charity-selector-header"),
     'changeup-charity-selector-merchant-statement': ContentMgr.getContent("changeup-charity-selector-merchant-statement"),
     'changeup-charity-supersize-header': ContentMgr.getContent("changeup-charity-supersize-header")
   }
   require('dw/template/ISML').renderTemplate('/dashboard/dashboard_v2', {
       config: require('*/cartridge/models/config').getConfig(),
       pages: pages,
       supersize_options: {
           options: Site.current.preferences.custom.supersize_options
       }
   });
 }

/**
 * Calls the ChangeUp api service to search for a charity.
 */
function charitySearch() {
    var search = require('*/cartridge/scripts/changeUp/services/search');
    var params = request.httpParameterMap;
    var result = {};

    if (params.query.submitted && params.query.stringValue) {
        result = search({
            query: params.query.stringValue,
            exclude: params.exclude.submitted ? params.exclude.stringValue : '',
            requireVerified: params.requireVerified.booleanValue
        });
    }

    require('~/cartridge/scripts/util/response').renderJSON(result);
}


/**
 * Saves the ChangeUp configureation.
 */
function saveConfig() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');

    var configObj = CustomObjectMgr.getCustomObject('ChangeUpConfig', 'config');

    if (!configObj) {
        Transaction.wrap(function () {
            configObj = CustomObjectMgr.createCustomObject('ChangeUpConfig', 'config');
        });
    }

    var reqBody = request.httpParameterMap.requestBodyAsString;
    var res = {
        success: false
    };

    if (reqBody) {
        Transaction.wrap(function () {
            configObj.custom.config = reqBody;
            res.success = true;
        });
    }

    require('~/cartridge/scripts/util/response').renderJSON(res);
}

/**
 * Capture reporting
 */
function sendDonations() {
    var captureReporting = require('~/cartridge/scripts/services/captureReporting');
    var orderMgr = require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    var orders = orderMgr.searchOrders(
        'custom.changeupAgreedToDonate={0} AND custom.changeupReportingConfirmationUUIDs=NULL and status!={1} and status!={2}',
        'creationDate desc',
        true,
        Order.ORDER_STATUS_FAILED,
        Order.ORDER_STATUS_CANCELLED
    );

    captureReporting(orders);
}

exports.Dashboard = guard.ensure(['https'], dashboard);
exports.Dashboardv2 = guard.ensure(['https'], dashboardv2);
exports.CharitySearch = guard.ensure(['https'], charitySearch);
exports.SaveConfig = guard.ensure(['https'], saveConfig);
exports.SendDonations = sendDonations;
