const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.append('List', function (req, res, next) {
    const Resource = require('dw/web/Resource');

    const updateAction = !empty(req.querystring.gtmAction) ? req.querystring.gtmAction : ''; // if user updates quantity (+)
    const action = !empty(req.querystring.action) ? req.querystring.action : '';
    const updateData = !empty(req.querystring.update) ? JSON.parse(req.querystring.update) : {};

    if (updateData && (action === Resource.msg('label.add', 'gtm', null) ||
        updateAction === Resource.msg('label.add.update', 'product', null))) {
        const viewData = res.getViewData();
        viewData.actionGTM = action;
        res.setViewData(viewData);
    }

    next();
}, GTM.bind('addToBox'));

server.append('AddListToCart', function (req, res, next) {
    next();
}, GTM.bind('addBoxToCart'));

module.exports = server.exports();
