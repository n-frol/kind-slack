var system = require( 'dw/system' );
var ProductMgr = require('dw/catalog/ProductMgr');
 
/**
 * function uses the BottomLineService to download ratings for each master product in the current catalog.
 * 
 */
function populateCustomObjects()
{
    var BottomLineService = require('*/cartridge/scripts/serviceregistry/BottomLineService');
    var products = ProductMgr.queryAllSiteProductsSorted();
    var productId = "";
    var average_score = 0;
    var total_reviews = 0;
    var ExportOrderModel = require('*/cartridge/scripts/model/orderexport/exportOrderModel');
    var exportOrderModelInstance = new ExportOrderModel();
    var yotpoConfigurations = exportOrderModelInstance.loadAllYotpoConfigurations();
    var yotpoAppKey = yotpoConfigurations[0].custom.appKey;
    var product = null;
    var Transaction = require('dw/system/Transaction');

        // Get api url from service definition
        var yotpoURL = "";
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var ratingObject = null;
        var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
        const serviceURL = BottomLineService.yotpoBottomLineSvc.getConfiguration().getCredential().getURL();

    while(products.hasNext()) {
        // we will only create entries for master products since we will store ratings at the master level
        product = products.next();
        if(!empty(product) && product.isOnline() && product.isMaster()) {
            productId = product.getID();
        // Replace string token with appkey saved in Custom Object
            yotpoURL = serviceURL.replace(':appkey', yotpoAppKey.toString());
            yotpoURL = yotpoURL.replace(':sku', productId);


            BottomLineService.yotpoBottomLineSvc.setURL(yotpoURL);
            var result = BottomLineService.yotpoBottomLineSvc.call();
            if (result.ok == false) {
                if (result.error != 404) {
                    yotpoLogger.logMessage('Yotpo Ratings populate error on ' + productId + 'error message: '+ result.errorMessage, 'error','RatingsPopulate' );
                    throw new Error(result.errorMessage);
                }else {
                    yotpoLogger.logMessage('Yotpo Ratings populate - Product not in Yotpo ' + productId, 'error', 'RatingsPopulate');
                    continue;
                }
            }
            var responseJSON = JSON.parse(result.object);
            average_score = responseJSON.response.bottomline.average_score;
            total_reviews = responseJSON.response.bottomline.total_reviews;
            // now work the custom object section

            ratingObject = CustomObjectMgr.getCustomObject('yotpoRatingStorage',productId.toString());
            Transaction.wrap(function () {
                if (ratingObject == null) {
                    ratingObject = CustomObjectMgr.createCustomObject('yotpoRatingStorage',productId.toString());
                }            
                saveCustomObjectData(ratingObject, 'average_score', average_score);
                saveCustomObjectData(ratingObject, 'total_reviews', total_reviews);            
            });
            yotpoLogger.logMessage('Yotpo Ratings populate - Successfully stored ' + productId, 'info', 'RatingsPopulate');
            yotpoLogger.logMessage('Yotpo Ratings populate - Successfully stored ' + productId + ' ' + average_score + ' ' + total_reviews, 'debug', 'RatingsPopulate');

        }
    }
    // we are done
    yotpoLogger.logMessage('Yotpo Ratings populate complete.', 'info', 'RatingsPopulate');
}

/**
 * Saves values to custom object
 *
 * @param {dw.object.CustomObject} customObject - SFCC Custom Object
 * @param {string} fieldId - Custom Object attribute ID
 * @param {Object} value - Value to save in Custom Object
 */
function saveCustomObjectData(customObject, fieldId, value) {
    var updatedCustomObject = customObject;
    if (Object.prototype.hasOwnProperty.call(updatedCustomObject, 'custom')) {
        require('dw/system/Transaction').wrap(function () {
            updatedCustomObject.custom[fieldId] = value;
        });
    }
} 
exports.populate = function( parameters, stepExecution )
{
  try
  {
      populateCustomObjects(); 
    return new system.Status(system.Status.OK);
  }
  catch(Error)
  {
    return new system.Status(system.Status.ERROR,Error,"failed");
  }
} 