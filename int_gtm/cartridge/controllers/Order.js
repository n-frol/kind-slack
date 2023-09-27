const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('History', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Order History'));

server.prepend('Details', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Order Details'));

server.prepend('Confirm', function (req, res, next) {
    const OrderMgr = require('dw/order/OrderMgr');
    const order = OrderMgr.getOrder(req.querystring.ID)

    if (!empty(order)) {
        const viewData = res.getViewData();
        viewData.orderGTM = order;
        res.setViewData(viewData);
    }

    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Order Confirm'));

server.append('Confirm', function (req, res, next) {
    next();
}, GTM.bind('addPurchaseInformation'));

module.exports = server.exports();