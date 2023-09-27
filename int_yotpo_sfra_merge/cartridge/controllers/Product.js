'use strict';

var server = require('server');
server.extend(module.superModule);

/**
 * Extends Product-Show controller to add Yotpo aggregate ratings SEO data to the View
 */
server.append('Show', function (req, res, next) {

    var yotpoAggregateData = {};
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var ratingObject = null;
    var productId = null;
    var viewData = res.getViewData();


    
    productId = viewData.product.masterId;

    ratingObject = CustomObjectMgr.getCustomObject('yotpoRatingStorage',productId.toString());
    if (!empty(ratingObject)) {
        viewData.yotpoAggregateData = yotpoAggregateData;
        viewData.yotpoAggregateData.average_score = ratingObject.custom.average_score;
        viewData.yotpoAggregateData.total_reviews = ratingObject.custom.total_reviews;
        res.setViewData(viewData);
    }

    next();
});

module.exports = server.exports();
