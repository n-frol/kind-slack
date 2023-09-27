/* global PIPELET_ERROR */
'use strict';

/**
 * Controller that handles site map requests.
 * @module controllers/SiteMap
 *
 * Imported from SiteGenesis - GHG 1/23/19:
 *  -  Refactored to work with SFRA
 */

var server = require('server');

/**
 * Serves requests for search provider (Google, Yahoo) XML site maps. Reads a
 * given site map and copies it into the request output stream. If this is successful,
 * renders an http_200 template. If it fails, renders the http_404 template.
 * SiteMap Rule:
 * # process sitemaps
 * RewriteRule ^/(sitemap([^/]*))$ /on/demandware.store/%{HTTP_HOST}/-/SiteMap-Google?name=$1 [PT,L]
 */
server.get('Google', function (req, res, next) {
    var Pipelet = require('dw/system/Pipelet');

    // TODO - rework
    var SendGoogleSiteMapResult = new Pipelet('SendGoogleSiteMap').execute({
        FileName: request.httpParameterMap.name.stringValue
    });

    if (SendGoogleSiteMapResult.result === PIPELET_ERROR) {
        res.render('sitemap/http_404');
    } else {
        res.render('sitemap/http_200');
    }

    return next();
});

/**
 * Renders the sitemap template (sitemap/sitemap template).
 */
server.get('Start', function (req, res, next) {
    res.render('sitemap/sitemap');
    return next();
});


module.exports = server.exports();
