var server = require('server');
var assets = require('*/cartridge/scripts/assets');
var URLUtils = require('dw/web/URLUtils');

server.extend(module.superModule);

server.append('Show', function (req, res, next) {
    assets.addJs('https://ui.powerreviews.com/stable/4.0/ui.js');
    assets.addJs(URLUtils.https('PowerReviews-Config.js').toString());
    assets.addJs('/js/powerreviews.js');
    assets.addCss('/css/powerreviews.css');

    next();
});

module.exports = server.exports();
