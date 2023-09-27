/* global customer */
'use strict';

// SFCC API includes
var URLUtils = require('dw/web/URLUtils');
var ContentMgr = require('dw/content/ContentMgr');

// SFRA Includes
var server = require('server');
var socialCards = require('*/cartridge/scripts/middleware/pageSocialCards');
var cache = require('*/cartridge/scripts/middleware/cache');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var sessionFlash = require('*/cartridge/scripts/util/sessionFlash');
var CustomObjectMgr = require("dw/object/CustomObjectMgr");

server.extend(module.superModule);

server.get('GetSlides', cache.applyDefaultCache, consentTracking.consent, function (req, res, next) {
    var slides = req.querystring.slides;
    var slidesArray = JSON.parse(slides);
    var ProductMgr = require('dw/catalog/ProductMgr');
    var prodsarray = [];
    slidesArray.forEach(function (slide) {
        var prod = ProductMgr.getProduct(slide.id);
        prodsarray.push(prod);
    });
    res.render('experience/components/slides/einstein_slide', {
        prods: prodsarray
    });
    return next();
});

server.post('RecaptchaVerify', function (req, res, next) {
    var data = req.form;
    var RecaptchaService = require('~/cartridge/scripts/recaptcha/RecaptchaService');
    var svc = RecaptchaService.get();
    var site = require('dw/system/Site').getCurrent();
    var secret = site.getCustomPreferenceValue('recaptcha3_secret');

    var resp = svc.call({
        secret: secret,
        response: data.token,
        remoteip: request.httpRemoteAddress
    });

    var viewData = res.getViewData();
    viewData.recaptcha = resp.object;
    res.setViewData(viewData);
    res.json(resp.object);
    next();
});

server.post('VerifyRecaptchaNotifyMe', function (req, res, next) {
    var data = req.form;
    var RecaptchaService = require('~/cartridge/scripts/recaptcha/RecaptchaService');
    var Transaction = require("dw/system/Transaction");
    var Site = require('dw/system/Site');
    var svc = RecaptchaService.get();
    var site = require('dw/system/Site').getCurrent();
    var secret = site.getCustomPreferenceValue('recaptcha3_secret');

    var resp = svc.call({
        secret: secret,
        response: data.token,
        remoteip: request.httpRemoteAddress
    });

    var score = resp.object.score;
    var passed = false;

    if (score > Site.current.getCustomPreferenceValue("recaptcha3_score")) {
        passed = true;
        try {
            Transaction.begin();
            var cob = CustomObjectMgr.createCustomObject(
                "NotifyMe",
                data.email + "-" + data.sku
            );
            cob.custom.email = data.email;
            cob.custom.name = data.name;
            cob.custom.sku = data.sku;
            Transaction.commit();
        } catch (e) {
            Transaction.rollback();
        }
    } else {
        passed = false;
    }

    res.json({
        passed: passed
    });

    next();
});

server.append('Show', cache.applyDefaultCache, consentTracking.consent, function (req, res, next) {
    var Site = require('dw/system/Site');
    var site = Site.getCurrent();
    var continueUrl;

    var canonicalURL = URLUtils.https('Page-Show');
    var viewData = res.getViewData();
    var apiContent = ContentMgr.getContent(req.querystring.cid);
    var byobCatId = site.getCustomPreferenceValue('byobRootCategoryID');

    if (apiContent) {
        canonicalURL.append('cid', req.querystring.cid);

        viewData.canonicalURL = canonicalURL;
        viewData.flash = sessionFlash.getAllFlashMessages();
    }

    if (req.querystring.combo) {
        var Transaction = require('dw/system/Transaction');
        var ProductListMgr = require('dw/customer/ProductListMgr');
        var ProductList = require('dw/customer/ProductList');
        var BYOBHelpers = require('*/cartridge/scripts/helpers/byobHelpers');
        var ProductFactory = require('*/cartridge/scripts/factories/product');

        viewData.cacheme = true;
        var byobList = BYOBHelpers.getBYOBList(session.customer); // eslint-disable-line
        var product = ProductFactory.get({ pid: req.querystring.combo });

        Transaction.wrap(function () {
            var sku;
            if (!empty(product.variationAttributes)) {
                byobList = ProductListMgr.createProductList(session.customer, ProductList.TYPE_CUSTOM_1); // eslint-disable-line
                var size = req.querystring.combo.replace(/[^0-9]/g, '');
                if (size == 20) { //eslint-disable-line
                    sku = dw.system.Site.current.getCustomPreferenceValue("byob20"); //eslint-disable-line
                } else {
                    sku = dw.system.Site.current.getCustomPreferenceValue("byob40"); //eslint-disable-line
                }
                byobList.custom.boxSku = sku;
                byobList.custom.isAddedToCart = false;
                byobList.custom.ogEvery = 0;
                byobList.custom.ogEveryPeriod = 0;
                byobList.custom.boxSize = size;
                session.custom.currentByobId = byobList.ID; //eslint-disable-line
            }
        });
        viewData.productList = byobList;
        continueUrl = URLUtils.https('Search-Show', 'cgid', byobCatId, 'combo', req.querystring.combo).toString();
    }

    // used for form success responses
    viewData.success = req.querystring.success;
    res.setViewData(viewData);
    if (continueUrl) {
        res.redirect(continueUrl);
    }
    next();
}, socialCards);

server.post('WholesaleOptOut', function (req, res, next) {
    var basket = require('dw/order/BasketMgr').getCurrentBasket();
    var email = basket.customerEmail;
    var KlaviyoSubscriptionUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');
    if (KlaviyoSubscriptionUtils.optOutWholesale({ email: email })) {
        res.json({ success: true });
    }
});

server.get('FacebookPageView', function (req, res, next) {
    var q = req.querystring;
    var url = q.url;
    if (url == null) {
        url = "https://www.kindsnacks.com";
    }
    var hookmgr = require('dw/system/HookMgr');
    var viewData = res.getViewData();
    hookmgr.callHook('app.facebook.facebookEvents', 'sendPageView', q.data, viewData, request, url);
    res.render('common/blank');

    return next();
});

server.get('OgSettings', function (req, res, next) {
    var params = req.querystring;
    var productSettings = !empty(params.productSettings) ? JSON.parse(params.productSettings) : {};
    productSettings.logged_in = customer.isAuthenticated();

    res.render('common/ogSettingsScripts', {
        productSettings: JSON.stringify(productSettings)
    });
    return next();
});


server.get('EinsteinCustom', function (req, res, next) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var params = req.querystring;
    var prods = JSON.parse(params.prods);
    var cats = JSON.parse(params.cats);
    var forced = JSON.parse(params.forced);
    var products = [];
    var catar = [];
    var forcedar = [];

    prods.forEach(pid => {
        var ppid = pid.trim();
        var p = ProductMgr.getProduct(ppid);
        products.push(p);
    });
    forced.forEach(pid => {
        var ppid = pid.trim();
        var p = ProductMgr.getProduct(ppid);
        forcedar.push(p);
    });
    cats.forEach(pid => {
        var ppid = pid.trim();
        var p = CatalogMgr.getCategory(ppid);
        catar.push(p);
    });

    var fulllist = [];
    if (products.length > 0) {
        products.forEach((e, i) => fulllist.push(e, catar[i])); // eslint-disable-line
    } else {
        fulllist = fulllist.concat(catar);
    }

    var diff =  products.length - catar.length; // eslint-disable-line
    var remain = [];
    if (diff < 0) {
        remain = catar.slice(diff);
        fulllist = fulllist.concat(remain);
    }

    fulllist = forcedar.concat(fulllist);

    var filtered = fulllist.filter(function (x) {
        return x !== undefined;
    });

    var unique = filtered.filter(onlyUnique); // eslint-disable-line

    res.render('components/einsteinSlider', {
        prods: unique
    });
    return next();
});

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

/**
 * Page-IncludeHeaderMenu : This is a local include that includes the navigation in the header
 * @name Base/Page-IncludeHeaderMenu
 * @function
 * @memberof Page
 * @param {middleware} - server.middleware.include
 * @param {middleware} - cache.applyDefaultCache
 * @param {category} - non-sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.append(
    'IncludeHeaderMenu',
    server.middleware.include,
    cache.applyDefaultCache,
    function (req, res, next) {
        var Site = require('dw/system/Site');
        var catalogMgr = require('dw/catalog/CatalogMgr');
        var Categories = require('*/cartridge/models/categories');
        var siteRootCategory = catalogMgr.getSiteCatalog().getRoot();
        var currentSite = Site.getCurrent();

        var topLevelCategories = siteRootCategory.hasOnlineSubCategories() ?
            siteRootCategory.getOnlineSubCategories() : null;

        var template = currentSite.ID === 'CreativeSnacks' ?
            '/components/header/menu-cs' : '/components/header/menu2';

        res.render(template, new Categories(topLevelCategories));
        next();
    }
);

module.exports = server.exports();
