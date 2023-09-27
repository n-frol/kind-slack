'use strict';

const server = require('server');
server.extend(module.superModule);

const consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
const pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
const PageMgr = require('dw/experience/PageMgr');

server.append('Show', consentTracking.consent, function (req, res, next) {    
    const page = PageMgr.getPage(req.querystring.cid);
    let params = {};
    if (page != null && page.isVisible()) {
        if (res.viewData.GTM_PAGE_DATA) {
            params.gtmPageData = res.viewData.GTM_PAGE_DATA;
        }
        if (!page.hasVisibilityRules()) {
            var ONE_WEEK = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
            response.setExpires(ONE_WEEK);
        }

        if (req.querystring.view && req.querystring.view === 'ajax') {
            params.decorator = 'common/layout/ajax';
        }
        response.writer.print(PageMgr.renderPage(page.ID, JSON.stringify(params)));
    } else {
        next();
    }
}, pageMetaData.computedPageMetaData);

module.exports = server.exports();
