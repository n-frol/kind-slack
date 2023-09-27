'use strict';

/**
 * Controller that provides functions Business Manager Sessions.
 * @module controllers/BMSession
 */

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
 * Renders the general TFD page.
 */
function keepAlive() {
    app.getView({
    	mainmenuname: request.httpParameterMap.mainmenuname.value,
    	CurrentMenuItemId: request.httpParameterMap.CurrentMenuItemId.value
    }).render('bmsession/keepalive');
}

/** Keeps a session alive.
 * @see {@link module:controllers/BMSession~keepAlive} */
exports.KeepAlive = guard.ensure(['get', 'https'], keepAlive);

