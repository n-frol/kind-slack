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
    require('dw/template/ISML').renderTemplate('/dashboard/dashboard_v2', {
        config: require('*/cartridge/models/config').getConfig(),
        supersize_options: {
            options: Site.current.preferences.custom.supersize_options,
            optionSalesUplift: Site.current.preferences.custom.supersize_options_salesuplift
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
 * Calls the Sandbox to search for category
 */
 function categorySearch() {
    var CategorySuggestions = require('*/cartridge/models/search/suggestions/category');
    var categorySuggestions;
    var params = request.httpParameterMap;
    var result = [];
    var suggestions;
    var count = 0;


        categorySuggestions = new CategorySuggestions();

        categorySuggestions.forEach(function(element) {
            result.push({
                name: element.name,
                sku:element.sku,
                donation: element.donation,
                products: element.products,
                imageUrl: element.image ? element.image.url : ''
            });
        });
    require('~/cartridge/scripts/util/response').renderJSON(result);
}
function productUpdateDonation() {
    var ProductSearch = require('*/cartridge/models/search/update')
    var params = request.httpParameterMap;
    var result = '';
    var productSearch;
    productSearch = new ProductSearch(params.query, params.value);
    result = productSearch
    require('~/cartridge/scripts/util/response').renderJSON(result);
 }
 function uploadNewIcon() {
    var LinkedHashMap = require('dw/util/LinkedHashMap');
    var File = require('dw/io/File');
    var ContentMgr = require('dw/content/ContentMgr');
    var URLUtils = require('dw/web/URLUtils');
    var filename;
    var params = request.httpParameterMap; 
    var files = new LinkedHashMap();
    var siteLibraryID = ContentMgr.getSiteLibrary().ID
    
    var folderPath = new File(File.getRootDirectory(File.LIBRARIES + File.SEPARATOR + siteLibraryID + File.SEPARATOR), 'default/ChangeUpIcons/');

    if (!folderPath.exists()) {
        folderPath.mkdirs();
    }
    
    var closure = function(field, ct, oname){ 
        filename = oname.replace(/ /g, "");;

 
        return new File( File.LIBRARIES + File.SEPARATOR + siteLibraryID + '/default/ChangeUpIcons/' + filename);
    };

    files = params.processMultipart(closure);

    var filePath = URLUtils.imageURL( URLUtils.CONTEXT_LIBRARY, null, '/ChangeUpIcons/' + filename, null ).toString();

    var res = {
        success: true,
        filePath: filePath,
        filename: filename
    };

    require('~/cartridge/scripts/util/response').renderJSON(res);
}
/**
 * Saves the ChangeUp configureation.
 */
function saveConfig() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Logger = require('dw/system/Logger');
    var Transaction = require('dw/system/Transaction');
    var uiConfig = require('~/cartridge/scripts/services/uiConfig');
    var result = null;

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
            res.success_localsave = true;
        });

        try {
            result = uiConfig.sendConfig().setThrowOnError().call(reqBody);
            if (result && result.ok) {
                res.success_serversave = true;
            }else{
                res.success_serversave = false;
                res.error_message = result.errorMessage;
                var resultMessage = JSON.parse(result.errorMessage);
                res.error_message = resultMessage && typeof resultMessage === 'object' && "message" in resultMessage ? resultMessage.message : res.error_message
                Logger.error("Error on sendConfig endpoint");
                Logger.error(JSON.stringify(result.errorMessage));
            }
        } catch (e) {
            Logger.error(JSON.stringify(e));
            res.errorMessage = 'There is a technical issue with the service.';
        }
        res.success = res.success_serversave && res.success_localsave;
    }

    require('~/cartridge/scripts/util/response').renderJSON(res);
}

/**
 * Capture reporting
 */
function sendDonations() {
    var CaptureReporting = require('~/cartridge/scripts/services/captureReporting');
    var orderMgr = require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    var orders = orderMgr.searchOrders(
        'custom.changeupAgreedToDonate={0} AND custom.changeupReportingConfirmationUUIDs=NULL AND status={1}',
        'creationDate desc',
        true,
        Order.ORDER_STATUS_COMPLETED
    );

    return CaptureReporting.sendOrders(orders);
}

exports.Dashboard = guard.ensure(['https'], dashboard);
exports.Dashboardv2 = guard.ensure(['https'], dashboardv2);
exports.CharitySearch = guard.ensure(['https'], charitySearch);
exports.SaveConfig = guard.ensure(['https'], saveConfig);
exports.CategorySearch = guard.ensure(['https'], categorySearch);
exports.ProductUpdateDonation = guard.ensure(['https'], productUpdateDonation);
exports.UploadNewIcon = guard.ensure(['https'], uploadNewIcon);
exports.SendDonations = sendDonations;
