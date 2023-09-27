/* eslint-disable */
/* global empty, session */
"use strict";

// SFCC API includes
var ProductMgr = require("dw/catalog/ProductMgr");
var CustomObjectMgr = require("dw/object/CustomObjectMgr");
var Site = require("dw/system/Site");
var Transaction = require("dw/system/Transaction");
var URLUtils = require("dw/web/URLUtils");
var EnumValue = require("dw/value/EnumValue");

// SFRA Includes
var server = require("server");
var BYOBHelpers = require("*/cartridge/scripts/helpers/byobHelpers");
var cache = require("*/cartridge/scripts/middleware/cache");
var ProductFactory = require("*/cartridge/scripts/factories/product");
var socialCards = require("*/cartridge/scripts/middleware/pageSocialCards");
var variationHelpers = require("*/cartridge/scripts/helpers/variationHelpers");

// custom includes
var GTM = require("int_googletagmanager/cartridge/scripts/helpers/GTM");
var ogHelpers = require("int_ordergroove/cartridge/scripts/ogHelpers");

server.extend(module.superModule);

server.get("SaveHotspots", function (req, res, next) {
    var spots = req.querystring.hotspots;
    var pid = req.querystring.pid;
    var prod = ProductMgr.getProduct(pid);
    Transaction.wrap(function () {
        prod.custom.image_hotspots = JSON.stringify(spots);
    });
});

server.post("NotifyMe", function (req, res, next) {
    var Transaction = require("dw/system/Transaction");
    var q = req.form;
    try {
        Transaction.begin();
        var cob = CustomObjectMgr.createCustomObject(
            "NotifyMe",
            q.email + "-" + q.sku
        );
        cob.custom.email = q.email;
        cob.custom.name = q.name;
        cob.custom.sku = q.sku;
        Transaction.commit();
    } catch (e) {
        Transaction.rollback();
    }
    res.json({
        msg: "We will email you when product is ready",
    });

    return next();
});

/**
 * If current BYOB list is from the MSI, clear it
 * Allows the user to access the BYOB PDP if they've started and didn't finish a BYOB MSI edit
 * That way, functionality is clear and prevents customers from making unintended edits
 */
function clearMsiByobList() {
    var byobList = BYOBHelpers.getBYOBList(session.customer);
    if (!empty(byobList) && !empty(byobList.custom.ogPublicID)) {
        BYOBHelpers.resetBYOBList(byobList);
    }
}

server.get("ConnectedProducts", function (req, res, next) {
    var view = req.querystring;
    var pid = view.pid;
    var plist = view.plist;
    var connectedp = [];
    var prods = [];
    if (pid) {
        var product = ProductMgr.getProduct(pid);
        var connecteds = product.custom.connected_products;
        if (connecteds) {
            connectedp = connecteds.split(",");
        }
    }
    if (plist) {
        connectedp = plist.split(",");
    }
    connectedp.forEach(function (p) {
        var thispid = p.trim().toUpperCase();
        var prod = ProductMgr.getProduct(thispid);
        prods.push(prod);
    });

    var q = "";

    res.render("product/connected", {
        prods: prods,
    });
    return next();
});

server.get("ConnectedSearch", function (req, res, next) {
    var params = req.querystring;
    var term = params.term;

    var ProductSearchModel = require("dw/catalog/ProductSearchModel");
    var apiProductSearch = new ProductSearchModel();
    var searchHelper = require("*/cartridge/scripts/helpers/searchHelpers");
    var CatalogMgr = require("dw/catalog/CatalogMgr");
    var ProductSearch = require("*/cartridge/models/search/productSearch");

    var qs = {
        lang: null,
        q: term,
        sz: 30,
    };

    apiProductSearch = searchHelper.setupSearch(apiProductSearch, qs);
    apiProductSearch.search();

    var productSearch = new ProductSearch(
        apiProductSearch,
        qs,
        req.querystring.srule,
        CatalogMgr.getSortingOptions(),
        CatalogMgr.getSiteCatalog().getRoot()
    );

    var q = "";
    res.render("product/connectedsearch", {
        results: productSearch,
    });
    return next();
});

/**
 * Creates the breadcrumbs object
 * @param {string} cgid - category ID from navigation and search
 * @param {string} pid - product ID
 * @param {Array} breadcrumbs - array of breadcrumbs object
 * @returns {Array} an array of breadcrumb objects
 *
 * Pulled in from SFRA Product.js and modified
 */
function getAllBreadcrumbs(cgid, pid, breadcrumbs) {
    var CatalogMgr = require("dw/catalog/CatalogMgr");

    var category;
    var product;
    if (!empty(pid)) {
        product = ProductMgr.getProduct(pid);
        category = product.variant
            ? product.masterProduct.primaryCategory
            : product.primaryCategory;
    } else if (!empty(cgid)) {
        category = CatalogMgr.getCategory(cgid);
    }

    if (!empty(category) && breadcrumbs && !empty(breadcrumbs.push)) {
        breadcrumbs.push({
            htmlValue: category.displayName,
            url: URLUtils.url("Search-Show", "cgid", category.ID),
        });

        if (
            !empty(category.parent) &&
            !empty(category.parent.ID) &&
            category.parent.ID !== "root"
        ) {
            return getAllBreadcrumbs(category.parent.ID, null, breadcrumbs);
        }
    }

    return breadcrumbs;
}

// Get around not having access to getAbsImageURL in the view
// Get responsive images of specific sizes for PDP primary slider
function responsiveSliderImages(pid, normal, small) {
    var responsiveImageUtils = require("*/cartridge/scripts/util/responsiveImageUtils");
    var product = ProductMgr.getProduct(pid);
    var images = product.getImages("large").toArray();
    var responsiveImages = [];
    var sizeNormal = normal || 817;
    var sizeSmall = small || 375;

    if (!empty(images)) {
        images.forEach(function (image) {
            responsiveImages.push({
                normal: responsiveImageUtils.getResponsiveImage(
                    image,
                    sizeNormal
                ),
                small: responsiveImageUtils.getResponsiveImage(
                    image,
                    sizeSmall
                ),
            });
        });
    }

    return responsiveImages;
}

/**
 * Determines if a given product has either a description or one of the various detail
 * field values
 *
 * @param {string} product - product view object
 * @returns {boolean} a boolean representing if the descriptionAndDetails block should be shown
 */
function hasDescriptionOrDetails(product) {
    /**
     * Determine whether or not the description and details field is empty, and thus whether to display it
     * Rather than have a crazy list of empty checks, store all the attribute names in an array for easy access, readability, and updating
     * Loop through fields and stop the first time one isn't empty
     */

    var descriptionAndDetailsFields = [
        "longDescription",
        "occasion",
        "nutritionFactsImage",
        "nutritionNotes",
        "texture",
        "benefits",
    ];

    for (var i = 0; i < descriptionAndDetailsFields.length; i++) {
        if (!empty(product[descriptionAndDetailsFields[i]])) {
            var field = product[descriptionAndDetailsFields[i]];

            // In addition to checking the field, we're checking if it's an EnumValue because those can return true for !empty() even when they have no value
            if (
                !empty(field) &&
                (field.class !== EnumValue || !empty(field.value))
            ) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Returns the box size for the given product
 *
 * @param {Object} product - The product to get the box size for
 * @returns {string} The box size
 */
function getCurrentBoxSize(product) {
    var len = product.variationAttributes
        ? product.variationAttributes.length
        : 0;
    var curBoxSize;
    for (var i = 0; i < len; i++) {
        var attribute = product.variationAttributes[i];

        if (attribute.attributeId === "size") {
            curBoxSize = attribute.displayValue.replace(/[^0-9]/g, "");
            break;
        }
    }

    return curBoxSize;
}

/**
 * Addon functionality easily accessible by both Product-Show and Product-ShowInCategory
 *
 * Extends the base endpoints for PDPs in the following ways:
 * - Checks if customer is authenticated. If they are checks to see if a current promotion has the
 *   flag for check address fraud check. If it does, then it make sure the customer's addresses
 *   don't match an address in the fraud check.
 *
 * @param {Object} req - The controller route's req variable
 * @param {Object} res - The controller route's res variable
 * @param {Function} next - The controller route's next variable
 */
function pdpAddonPrepend(req, res, next) {
    var CustomOrderHelpers = require("*/cartridge/scripts/checkout/customOrderHelpers");
    var product = ProductFactory.get(req.querystring);
    var newProductID = variationHelpers.checkGetVariantProductID(product);

    var viewData = res.getViewData();
    viewData.isProd = true;
    res.setViewData(viewData);

    if (!empty(product.isBlockedAccess) && product.isBlockedAccess) {
        if (product.productType === "variant" && !empty(product.masterId)) {
            res.redirect(URLUtils.url("Product-Show", "pid", product.masterId));
        } else {
            res.redirect(URLUtils.url("Home-Show"));
        }
    }

    var newProduct;
    if (!empty(newProductID)) {
        newProduct = ProductMgr.getProduct(newProductID.pid);
    } else {
        newProduct = product.raw;
    }

    session.custom.hasAddressFraud = false;

    if (newProduct.custom.isCheckAddressFraud) {
        var hasPassedAddressFraud;
        if (!empty(session.customer)) {
            var Customer = session.customer;
            var addressBook = Customer.getAddressBook();
            if (!empty(addressBook)) {
                var addresses = addressBook.getAddresses();
                if (!empty(addresses)) {
                    session.custom.hasAddressFraud = true;
                    for (var i = 0; addresses.length > i; i++) {
                        var addressOne = addresses[i].address1;
                        var addressTwo = addresses[i].address2;
                        var addressCity = addresses[i].city;
                        var addressState = addresses[i].stateCode;
                        var addressPostalCode = addresses[i].postalCode;
                        var objectKey = CustomOrderHelpers.getAddressKey(
                            addresses[i]
                        );

                        if (!empty(objectKey)) {
                            var addressObject = CustomObjectMgr.getCustomObject(
                                "AddressFraud",
                                objectKey
                            );

                            if (!empty(addressObject)) {
                                var addressOneCheck =
                                    addressObject.custom.addressOne.toUpperCase();
                                var addressTwoCheck =
                                    addressObject.custom.addressTwo;
                                var addressCityCheck =
                                    addressObject.custom.city;
                                var addressStateCheck =
                                    addressObject.custom.stateCode;
                                var addressPostalCodeCheck =
                                    addressObject.custom.postalCode;

                                if (!empty(addressOne)) {
                                    addressOne = addressOne.toUpperCase();
                                }

                                if (!empty(addressTwo)) {
                                    addressTwo = addressTwo.toUpperCase();
                                }

                                if (!empty(addressCity)) {
                                    addressCity = addressCity.toUpperCase();
                                }

                                if (!empty(addressState)) {
                                    addressState = addressState.toUpperCase();
                                }

                                if (!empty(addressPostalCode)) {
                                    addressPostalCode =
                                        addressPostalCode.toUpperCase();
                                }

                                if (!empty(addressTwoCheck)) {
                                    addressTwoCheck =
                                        addressTwoCheck.toUpperCase();
                                }

                                if (!empty(addressCityCheck)) {
                                    addressCityCheck =
                                        addressCityCheck.toUpperCase();
                                }

                                if (!empty(addressStateCheck)) {
                                    addressStateCheck =
                                        addressStateCheck.toUpperCase();
                                }

                                if (
                                    !empty(addressOneCheck) &&
                                    !empty(addressCityCheck) &&
                                    !empty(addressStateCheck) &&
                                    !empty(addressPostalCodeCheck)
                                ) {
                                    if (
                                        addressOneCheck === addressOne &&
                                        addressTwoCheck === addressTwo &&
                                        addressCityCheck === addressCity &&
                                        addressStateCheck === addressState &&
                                        addressPostalCodeCheck ===
                                            addressPostalCode
                                    ) {
                                        hasPassedAddressFraud = false;
                                        break;
                                    } else {
                                        hasPassedAddressFraud = true;
                                    }
                                } else {
                                    hasPassedAddressFraud = true;
                                }
                            } else {
                                hasPassedAddressFraud = true;
                            }
                        }
                    }
                    if (
                        !empty(hasPassedAddressFraud) &&
                        hasPassedAddressFraud
                    ) {
                        session.custom.hasAddressFraud = false;
                    }
                }
            }
        }
    }
    next();
}

/**
 * Addon functionality easily accessible by both Product-Show and Product-ShowInCategory
 *
 * Extends the base PDPs in the following ways:
 * - Adds responsive images to view data (pdict).
 * - Checks whether to show the descriptionAndDetails block.
 * - Appends the Cononical URL to the view data (pdict).
 * - Adds a SocialCards model to the view data for Twitter Cards.
 * - Checks for variants with the custom attribute showOnPDP set as false and
 *      displays the master product instead of the variation.
 *
 * @param {Object} req - The controller route's req variable
 * @param {Object} res - The controller route's res variable
 * @param {Function} next - The controller route's next variable
 */
function pdpAddonAppend(req, res, next) {
    var CatalogMgr = require("dw/catalog/CatalogMgr");
    var params = req.querystring;
    var viewData = res.getViewData();
    var product = viewData.product;
    var productType = product.productType;
    var canonicalURL = URLUtils.https("Product-Show");
    var responsiveImages = responsiveSliderImages(params.pid);

    var newProductID = variationHelpers.checkGetVariantProductID(product);

    if (!empty(newProductID) && !newProductID.error) {
        var newProduct = ProductFactory.get(newProductID);

        if (!empty(newProduct)) {
            viewData.product = newProduct;
        }
    }

    viewData.addToCartUrl = viewData.product.isByobMaster
        ? URLUtils.url("Product-SubmitBox")
        : URLUtils.url("Cart-AddProduct");
    viewData.responsiveImages = responsiveImages;

    if (productType === "bundle" && !empty(product.bundledProducts)) {
        var len = product.bundledProducts.length; // Loop will be slightly more optimised if we declare length out here
        for (var i = 0; i < len; i++) {
            product.bundledProducts[i].responsiveImages =
                responsiveSliderImages(product.bundledProducts[i].id, 90);
        }
    }

    // The canonical URL should point to the master product per TSD.
    var master;
    if (
        productType !== "variant" &&
        productType !== "variationGroup" &&
        productType !== "bundle"
    ) {
        canonicalURL.append("pid", product.id);
    } else {
        if (
            Object.hasOwnProperty.call(
                ProductMgr.getProduct(product.id),
                "getMasterProduct"
            )
        ) {
            master = ProductMgr.getProduct(product.id).getMasterProduct();
        } else {
            master = product;
        }

        canonicalURL.append("pid", master.ID);
    }

    viewData.activeStep = 1;
    viewData.showDescriptionAndDetails = viewData.product.isByobMaster
        ? false
        : hasDescriptionOrDetails(viewData.product);
    viewData.templateClass = "st-pdp-main";
    viewData.canonicalURL = canonicalURL;

    var category;
    if (!empty(params.cgid) && params.cgid.submitted) {
        category = CatalogMgr.getCategory(params.cgid.stringValue);
    }

    viewData.DataLayer = GTM.ProductDetailDataLayerHelper(
        product.raw,
        category
    ); // eslint-disable-line new-cap

    var byobList = BYOBHelpers.getBYOBList(session.customer);

    if (byobList) {
        viewData.selectedBox = {
            boxSize: byobList.custom.boxSize,
            boxSku: byobList.custom.boxSku,
            ogEvery: byobList.custom.ogEvery,
            ogEveryPeriod: byobList.custom.ogEveryPeriod
        };
    }

    res.setViewData(viewData);

    /**
     * Switch to a bundle template if we need it, but it wasn't set by base
     * This would occur if we're viewing a master product
     * We want to make sure the bundle is the only visible variant so as not to cause issues
     */
    if (
        viewData.product.productType === "bundle" &&
        !empty(viewData.product.masterId) &&
        viewData.product.masterId !== viewData.product.id &&
        variationHelpers.methods.getVisibleVariants(
            viewData.product.raw.variationModel
        ).length === 1
    ) {
        res.render("product/bundleDetails");
    }

    next();
}

/**
 * @extends Product-Show
 *
 * Extends the base Product-Show endpoint in the following ways:
 * - Checks if customer is authenticated. If they are checks to see if a current promotion has a the
 *   flag for check address fraud check. If it does, then it make sure the customer's addresses
 *   don't match an address in the fraud check.
 */
server.prepend("Show", pdpAddonPrepend);

/**
 * @extends Product-ShowInCategory
 */
server.prepend("ShowInCategory", pdpAddonPrepend);

/**
 * @extends Product-Show
 */
server.append("Show", pdpAddonAppend, socialCards);

/**
 * @extends Product-ShowInCategory
 *
 * Extends the base Product-ShowInCategory endpoint in the following ways:
 * - Adds responsive images to view data (pdict).
 * - Checks whether to show the descriptionAndDetails block.
 * - Appends the Cononical URL to the view data (pdict).
 * - Adds a SocialCards model to the view data for Twitter Cards.
 */
server.append("ShowInCategory", pdpAddonAppend, socialCards);

server.append("Variation", function (req, res, next) {
    var renderTemplateHelper = require("*/cartridge/scripts/renderTemplateHelper");

    var viewData = res.getViewData();
    var responsiveImages = responsiveSliderImages(viewData.product.id);
    viewData.responsiveImages = responsiveImages;

    var addToCartUrl = viewData.product.isByobMaster
        ? URLUtils.url("Product-SubmitBox")
        : URLUtils.url("Cart-AddProduct");

    // Get the customer's current BYOB list if it exists.
    var byobList = BYOBHelpers.getBYOBList(session.customer);

    var product = viewData.product;

    var curBoxSize = getCurrentBoxSize(product);

    var showConfirmEmptyDialog = false;

    if (
        !empty(byobList) &&
        !empty(curBoxSize) &&
        byobList.items.toArray().length > 0 &&
        parseInt(curBoxSize, 10) < parseInt(byobList.custom.boxSize, 10)
    ) {
        showConfirmEmptyDialog = true;
    }

    var attributeContext = {
        addToCartUrl: addToCartUrl,
        byobList: byobList,
        product: viewData.product,
        showConfirmEmptyDialog: showConfirmEmptyDialog ? "true" : "false"
    };

    ogHelpers.setProductValues(attributeContext);

    var attributeTemplate = "product/productAddToCart";
    viewData.product.detailsHtml = renderTemplateHelper.getRenderedHtml(
        attributeContext,
        attributeTemplate
    );

    res.setViewData(viewData);

    next();
});

server.append("ShowQuickView", function (req, res, next) {
    var viewData = res.getViewData();
    var responsiveImages = responsiveSliderImages(viewData.product.id);
    viewData.responsiveImages = responsiveImages;

    var product = viewData.product;
    var newProductID = variationHelpers.checkGetVariantProductID(product);

    if (!empty(newProductID)) {
        var newProduct = ProductFactory.get(newProductID);

        if (!empty(newProduct)) {
            viewData.product = newProduct;
        }
    }

    var breadcrumbs = getAllBreadcrumbs(
        null,
        viewData.product.id,
        []
    ).reverse();
    viewData.breadcrumbs = breadcrumbs;

    viewData.templateClass = "st-product-quickview-main";

    res.setViewData(viewData);

    this.on("route:BeforeComplete", function (req, res) {
        // eslint-disable-line no-shadow
        var viewData2 = res.getViewData();
        var addToCartUrl = URLUtils.url("Cart-AddProduct");
        res.render(viewData2.template, {
            product: viewData2.product,
            addToCartUrl: addToCartUrl,
            resources: viewData2.resources,
        });
    });

    next();
});

/**
 * @typedef ProductDetailPageResourceMap
 * @type Object
 * @property {String} global_availability - Localized string for "Availability"
 * @property {String} label_instock - Localized string for "In Stock"
 * @property {String} global_availability - Localized string for "This item is currently not
 *     available"
 * @property {String} info_selectforstock - Localized string for "Select Styles for Availability"
 */

/**
 * Generates a map of string resources for the template
 *
 * @returns {ProductDetailPageResourceMap} - String resource map
 */
function getResources() {
    var Resource = require("dw/web/Resource");

    return {
        info_selectforstock: Resource.msg(
            "info.selectforstock",
            "product",
            "Select Styles for Availability"
        ),
    };
}

server.get("AddToCart", function (req, res, next) {
    var site = Site.getCurrent();
    var params = req.querystring;
    var product = ProductFactory.get(params);
    var addToCartUrl = product.isByobMaster
        ? URLUtils.url("Product-SubmitBox")
        : URLUtils.url("Cart-AddProduct");
    var byobList;
    var confirmEmptyUrl = URLUtils.https("BYOB-ConfirmEmpty", "context", "pdp");
    var template = product.isByobMaster
        ? "product/productAddToCartBYOB"
        : "product/productAddToCart";

    if (product.isByobMaster) {
        clearMsiByobList();
        // Get the customer's current BYOB list if it exists.6
        byobList = BYOBHelpers.getBYOBList(session.customer);
    }

    var curBoxSize = getCurrentBoxSize(product);

    var showConfirmEmptyDialog = false;
    if (
        !empty(byobList) &&
        parseInt(curBoxSize, 10) < parseInt(byobList.custom.boxSize, 10)
    ) {
        showConfirmEmptyDialog = true;
    }

    var p = ProductMgr.getProduct(product.masterId);
    var nfsmessage = p.custom.nfsmessage;
    var sellable = p.custom.sellable;
    var intervals = (
        site.getCustomPreferenceValue("subscriptionIntervals") || []
    ).map(function (intervalData) {
        var interval = intervalData.split("|");
        var everyData = interval[1].split("_");
        return {
            days: parseInt(interval[0], 10).toFixed(0),
            ogEvery: parseInt(everyData[0], 10).toFixed(0),
            ogEveryPeriod: parseInt(everyData[1], 10).toFixed(0),
        };
    });
    var isAddedToCart = false;
    var selectedDaysOption = "0";
    var isProductSelected = byobList && byobList.custom.boxSku === product.id;
    var ogEveryPeriod =
        byobList && byobList.custom.ogEveryPeriod
            ? byobList.custom.ogEveryPeriod
            : null;
    var ogEvery =
        byobList && byobList.custom.ogEvery && isProductSelected
            ? byobList.custom.ogEvery
            : null;

    if ((ogEvery === null || ogEvery === "0") && intervals.length) {
        ogEvery = intervals[0].days;
        selectedDaysOption = intervals[0].days;
    }

    intervals.some(function (interval) {
        if (
            interval.ogEvery === ogEvery &&
            interval.ogEveryPeriod === ogEveryPeriod
        ) {
            selectedDaysOption = interval.days;
            return true;
        }
        return false;
    });
    if (
        ogEvery !== null &&
        ogEvery !== "0" &&
        ogEveryPeriod !== null &&
        ogEveryPeriod !== "0" &&
        selectedDaysOption === "0" &&
        intervals.length
    ) {
        selectedDaysOption = intervals[0].days;
    }
    var BasketMgr = require("dw/order/BasketMgr");
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        isAddedToCart = currentBasket.productLineItems
            .toArray()
            .some(function (lineItem) {
                return product.id === lineItem.productID;
            });
    }

    res.render(template, {
        selectedDaysOption: selectedDaysOption,
        isProductSelected: isProductSelected,
        ogEveryPeriod: ogEveryPeriod,
        ogEvery: ogEvery,
        sellable: sellable,
        nfsmessage: nfsmessage,
        product: product,
        isQuickView: params.isQuickView === "true",
        addToCartUrl: addToCartUrl,
        byobList: byobList,
        isAddedToCart: isAddedToCart,
        byobSubscribeIntervals: intervals,
        confirmEmptyUrl: confirmEmptyUrl,
        showConfirmEmptyDialog: showConfirmEmptyDialog ? "true" : "false",
        resources: getResources(),
    });
    next();
});

server.get(
    "ShowInfoQuickView",
    cache.applyPromotionSensitiveCache,
    function (req, res, next) {
        var params = req.querystring;
        var product = ProductFactory.get(params);
        var addToCartUrl = product.isByobMaster
            ? URLUtils.url("Product-SubmitBox")
            : URLUtils.url("Cart-AddProduct");
        var template =
            product.productType === "set"
                ? "product/setQuickView.isml"
                : "product/infoQuickView.isml";

        var responsiveImages = responsiveSliderImages(product.id);

        var newProductID = variationHelpers.checkGetVariantProductID(product);

        if (!empty(newProductID)) {
            var newProduct = ProductFactory.get(newProductID);

            if (!empty(newProduct)) {
                product = newProduct;
            }
        }

        var isByobListFull = false;

        if (params.isByob === "true") {
            var ProductListModel = require("*/cartridge/models/product/productList");
            var byobList = BYOBHelpers.getBYOBList(session.customer);
            if (byobList) {
                var plModel = new ProductListModel(byobList);
                isByobListFull =
                    parseInt(plModel.boxSize, 10) ===
                    parseInt(plModel.totalInBox, 10);
            }
        }

        var isSwap = params.isSwap;

        var breadcrumbs = getAllBreadcrumbs(null, product.id, []).reverse();

        res.render(template, {
            isByobListFull: isByobListFull,
            paramsPid: params.pid,
            breadcrumbs: breadcrumbs,
            product: product,
            isByob: params.isByob || "",
            isSwap: params.isSwap || "",
            addToCartUrl: addToCartUrl,
            resources: getResources(),
            responsiveImages: responsiveImages,
            templateClass: "st-product-quickview-main",
        });

        next();
    }
);

server.get("EditBox", function (req, res, next) {
    var params = req.querystring;
    var boxId = params.bid;

    if (!empty(boxId)) {
        session.custom.currentByobId = boxId;
        var byobCat =
            Site.current.getCustomPreferenceValue("byobRootCategoryID");

        if (!empty(byobCat)) {
            res.redirect(URLUtils.url("Search-Show", "cgid", byobCat));
        }
    }

    return next();
});

server.get("PickYourSnacks", function (req, res, next) {
    var template = "product/pickYourSnacks";

    res.render(template, {
        activeStep: 2,
    });

    next();
});

server.post("SubmitBox", function (req, res, next) {
    var ProductListMgr = require("dw/customer/ProductListMgr");
    var ProductList = require("dw/customer/ProductList");
    var ChangeProduct = require("int_ordergroove/cartridge/scripts/changeProduct");
    var viewData = res.getViewData();
    var byobCat = Site.current.getCustomPreferenceValue("byobRootCategoryID");
    var form = req.form;

    if (!empty(byobCat)) {
        viewData.forwardUrl =
            form.mode && form.mode === "scale"
                ? URLUtils.url("Search-Show", "cgid", byobCat).toString()
                : URLUtils.url("Product-PickYourSnacks").toString();
    } else {
        viewData.forwardUrl = URLUtils.url("Home-Show").toString();
    }

    var byobList = BYOBHelpers.getBYOBList(session.customer);

    if (!empty(form) && !empty(form.pid)) {
        // If there is a current list, update the list from the current variant.
        if (!empty(byobList)) {
            // Is SubmitBox in scale mode and ogPublicID exist, call OG Change Product service to update product scale on OG side
            if (
                form.mode &&
                form.mode === "scale" &&
                byobList.custom.ogPublicID
            ) {
                var customerID = session.customer.profile.customerNo;
                var apiResult = ChangeProduct.changeProduct(
                    customerID,
                    byobList,
                    form.pid
                );
                if (!apiResult.ok) {
                    res.setStatusCode(500);
                    res.json({});
                    next();
                    return;
                }
            }

            BYOBHelpers.updateBYOBList(byobList, {
                boxSku: form.pid,
                every: form.every || 0,
                everyPeriod: form.everyPeriod || 0,
            });
        } else {
            var product = ProductFactory.get({ pid: form.pid });

            Transaction.wrap(function () {
                if (!empty(product.variationAttributes)) {
                    byobList = ProductListMgr.createProductList(
                        session.customer,
                        ProductList.TYPE_CUSTOM_1
                    );
                    byobList.custom.boxSku = product.id;
                    byobList.custom.isAddedToCart = false;
                    byobList.custom.ogEvery = form.every || 0;
                    byobList.custom.ogEveryPeriod = form.everyPeriod || 0;

                    var len = product.variationAttributes.length;
                    for (var i = 0; i < len; i++) {
                        var attribute = product.variationAttributes[i];

                        if (attribute.attributeId === "size") {
                            var size = attribute.displayValue.replace(
                                /[^0-9]/g,
                                ""
                            );
                            byobList.custom.boxSize = size;
                            break;
                        }
                    }
                }
            });
        }
    }

    viewData.activeStep = 2;

    res.setViewData(viewData);

    res.json({});
    next();
});

module.exports = server.exports();
