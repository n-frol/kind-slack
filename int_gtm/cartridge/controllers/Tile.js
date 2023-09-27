const server = require('server');
server.extend(module.superModule);

server.append('ConfigurationCategoryShow', function (req, res, next) {
    const viewData = res.getViewData();

    viewData.gtmProductIndex = !empty(req.querystring.gtmProductIndex) ? req.querystring.gtmProductIndex : null;
    res.setViewData(viewData);

    next();
});

server.prepend('Show', function (req, res, next) {
    const viewData = res.getViewData();

    viewData.gtmProductIndex = !empty(req.querystring.gtmProductIndex) ? req.querystring.gtmProductIndex : null;
    viewData.itemListName = !empty(req.querystring.itemListName) ? req.querystring.itemListName : null;
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
