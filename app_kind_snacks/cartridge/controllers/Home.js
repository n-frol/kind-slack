/* eslint-disable eqeqeq */
/* eslint-disable no-undef */
/* eslint-disable default-case */

'use strict';

/**
 * Home.js
 * @extends app_storefront_base/cartridge/controllers/Home.js
 *
 * Renders the site home page, and an error page for unfound pages.
 */

// Import system classes
var ContentMgr = require('dw/content/ContentMgr');
var URLUtils = require('dw/web/URLUtils');
var PageMgr = require('dw/experience/PageMgr');

// Middleware imports
var server = require('server');
var cache = require('*/cartridge/scripts/middleware/cache');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');

// Import modules
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

server.get('Show', consentTracking.consent, cache.applyDefaultCache,
    function (req, res, next) {
        var contentFolder = ContentMgr.getSiteLibrary().getRoot();
        var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');

        if (!empty(contentFolder)) {
            pageMetaHelper.setPageMetaData(req.pageMetaData, contentFolder);
        }
        // eslint-disable-next-line
        var LoginRadius = require('*/cartridge/models/loginRadius');
        // eslint-disable-next-line
        var loginRadius = new LoginRadius();
        // eslint-disable-next-line
        var loginRadiusForwardingURL = URLUtils.url('Account-Show');
        // eslint-disable-next-line
        let renderPage = null;
        switch (dw.system.Site.getCurrent().ID) {
            case 'kind_b2b':
                renderPage = '/home/homePageB2B';
                break;
            case 'KINDSnacks':
                renderPage = '/home/homePage';
                break;
            case 'CreativeSnacks':
                renderPage = '/home/homePageCreativeSnacks';
                break;
        }
        // eslint-disable-next-line
        let page = null;
        switch (dw.system.Site.getCurrent().ID) {
            case 'kind_b2b':
                page = PageMgr.getPage('homeb2bloggedout');
                break;
            case 'KINDSnacks':
                page = PageMgr.getPage("homepage");
                break;
            case 'CreativeSnacks':
                page = PageMgr.getPage("homepage_creative_snacks");
                break;
        }
        var params = {};
        params.gtmPageData = res.viewData.GTM_PAGE_DATA;
        // eslint-disable-next-line
        if (dw.system.Site.getCurrent().name == "Kind B2B" && !session.isCustomerAuthenticated()) {
            response.writer.print(PageMgr.renderPage(page.ID, JSON.stringify(params)));
            return;
        }
        // eslint-disable-next-line
        if (dw.system.Site.getCurrent().name == "Kind B2B" && session.isCustomerAuthenticated()) {
            page = PageMgr.getPage('homepage_b2b');
            response.writer.print(PageMgr.renderPage(page.ID, JSON.stringify(params)));
            return;
        }

        // eslint-disable-next-line
        if (dw.system.Site.getCurrent().ID == "KINDSnacks" ||
            dw.system.Site.getCurrent().ID == "CreativeSnacks" ||
            (dw.system.Site.getCurrent().name == "Kind B2B" && session.isCustomerAuthenticated())) {
            response.writer.print(PageMgr.renderPage(page.ID, JSON.stringify(params)));
        } else {
            res.render(page, {
                loginRadius: loginRadius,
                loginRadiusForwardingURL: loginRadiusForwardingURL,
                canonicalURL: URLUtils.https('Home-Show')
            });
            next();
        }
    },
    pageMetaData.computedPageMetaData
);

server.get('ErrorNotFound', function (req, res, next) {
    res.setStatusCode(410);
    res.render('error/notFound');
    next();
});

module.exports = server.exports();
