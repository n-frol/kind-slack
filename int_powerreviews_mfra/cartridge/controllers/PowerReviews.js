var server = require('server');

var PowerReviews = require('~/cartridge/scripts/lib/libPowerReviews');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');

server.get('WriteReviewPage', function (req, res, next) {
    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    var ProductFactory = require('*/cartridge/scripts/factories/product');

    var ProductMgr = require('dw/catalog/ProductMgr');
    var URLUtils = require('dw/web/URLUtils');
    var product = ProductMgr.getProduct(req.querystring.pr_page_id);
    var productModel = ProductFactory.get({ pid: product.ID });
    var libPR = new PowerReviews(req.locale.id);

    pageMetaHelper.setPageMetaData(req.pageMetaData, productModel);
    pageMetaHelper.setPageMetaTags(req.pageMetaData, productModel);

    if (!libPR.getOnlineStatus()) {
        res.setStatusCode(404);
        res.render('error/notFound');
        next();
    } else {
        if (!req.currentCustomer.raw.registered && libPR.getLoginRequired()) {
            req.session.privacyCache.set('powerReviewsRedirect', URLUtils.https('PowerReviews-WriteReviewPage').toString() + '?' + req.querystring.toString());
            res.redirect(URLUtils.https('Login-Show'));
        } else {
            res.render('powerreviews/writereview', {
                Product: product,
                PageId: req.querystring.pr_page_id,
                libPR: libPR
            });
        }

        next();
    }
}, pageMetaData.computedPageMetaData);

/**
 * Renders (cached) configuration data as a script for inclusion in
 * page footer
 */
server.get('Config.js', function (req, res, next) {
    var libPR = new PowerReviews(req.locale.id);

    if (!libPR.getOnlineStatus()) {
        res.setStatusCode(404);
        res.render('error/notFound');
        next();
    } else {
        res.cacheExpiration(24);
        res.render('powerreviews/config', {
            libPR: libPR
        });

        next();
    }
});

/**
 * Renders (cached) configuration data as a script for inclusion in
 * page footer
 */
server.get('Analytics.js', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');

    var libPR = new PowerReviews(req.locale.id);
    var orderNo = req.querystring.orderNo;
    var order = OrderMgr.getOrder(orderNo);

    if (!libPR.getOnlineStatus() || !order) {
        res.setStatusCode(404);
        res.render('error/notFound');
        next();
    } else {
        var orderItems = [];
        var plis = order.getAllProductLineItems();
        for (var i = 0; i < plis.length; i++) {
            var pli = plis[i];
            var variantID = '';
            var productID = pli.product.ID;

            if (pli.product) {
                if (pli.product.variant) {
                    productID = pli.product.masterProduct.ID;
                    variantID = pli.product.ID;
                }
                orderItems.push({
                    page_id: productID,
                    page_id_variant: variantID,
                    product_name: pli.productName,
                    quantity: pli.quantityValue,
                    unit_price: pli.price.value
                });
            }
        }
        res.cacheExpiration(24);
        res.render('powerreviews/analytics', {
            libPR: libPR,
            Order: order,
            OrderItems: orderItems
        });

        next();
    }
});
module.exports = server.exports();
