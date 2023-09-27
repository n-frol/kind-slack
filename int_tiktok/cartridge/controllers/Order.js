const server = require('server');
const TIKTOK = require('*/cartridge/scripts/utils/TIKTOK');

server.extend(module.superModule);

server.prepend('Confirm', function (req, res, next) {
    const OrderMgr = require('dw/order/OrderMgr');
    const order = OrderMgr.getOrder(req.querystring.ID);
// eslint-disable-next-line
    if (!empty(order)) {
        const viewData = res.getViewData();
        viewData.orderTIKTOK = order;
        viewData.tickTockAction = 'PlaceAnOrder';
        res.setViewData(viewData);
    }

    next();
});

server.append('Confirm', function (req, res, next) {
    next();
}, TIKTOK.bind('addPurchaseInformation'));

module.exports = server.exports();
