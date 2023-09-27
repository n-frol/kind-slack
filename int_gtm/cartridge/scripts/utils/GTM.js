const StringUtils = require('dw/util/StringUtils');
const assign = require("modules/server/assign");
const parseJSON = require('*/cartridge/scripts/util/parseJSON');

const PAGE_TYPES = {
    PLP: 'plp',
    PDP: 'pdp',
    HOME: 'Home',
    CONTENT_ASSET: 'Asset',
    CHECKOUT: 'Checkout',
    ACCOUNT: "Account",
    LOGIN: "Login",
    SUBSCRIBE: 'Subscribe',
    CART: 'Cart',
    FOLDER: 'Folder'
};

function callNext(next) {
    if (next) {
        next();
    }
}

/**
 * Data which is rendered in gtm.isml from Page-GTM
 * @param res Response
 * @param data Object to inject to res.gtmPageData
 */
function addGTMPageDataForRender(res, data) {
    if (!res.viewData.gtmPageData) {
        res.viewData.gtmPageData = {};
    }
    res.viewData.gtmPageData = assign(res.viewData.gtmPageData, data);
}

function addGTMPageDataForRender2(res, data) {
    if (!res.viewData.gtmPageData2) {
        res.viewData.gtmPageData2 = {};
    }
    res.viewData.gtmPageData2 = assign(res.viewData.gtmPageData2, data);
}

function addGTMPageData(res, data) {
    let gtmPageData = getGTMPageData(res);
    res.viewData.GTM_PAGE_DATA = StringUtils.encodeBase64(JSON.stringify(assign(gtmPageData, data)));
}

function pushGTMEvents(res, events) {
    res.setViewData({
        gtmPageData: (res.viewData.gtmPageData || []).concat(events)
    });
}

/**
 * Data which is hashed on page load in middlewares and loaded to prevent GTM caching as remote include
 * @param res Response
 * @returns Object gtm data object
 */
function getGTMPageData(res) {
    if (!res.viewData.GTM_PAGE_DATA) {
        // Init page data
        res.viewData.GTM_PAGE_DATA = StringUtils.encodeBase64(JSON.stringify({}));
    }
    return parseJSON(StringUtils.decodeBase64(res.viewData.GTM_PAGE_DATA), {});
}

function getParentSection() {
    const GeneralUtil = require('*/cartridge/scripts/utils/GeneralUtil');
    const siteSectionCookie = GeneralUtil.getCookie('site-section');

    if (siteSectionCookie) {
        return siteSectionCookie.getValue();
    }
}
function removeSiteSectionCookie() {
    const GeneralUtil = require('*/cartridge/scripts/utils/GeneralUtil');
    const siteSectionCookie = GeneralUtil.getCookie('site-section');

    if (siteSectionCookie) {
        GeneralUtil.setCookie(siteSectionCookie.getName(), undefined, 0, "/");
    }
}


function getContentName(contentId) {
    const ContentMgr = require('dw/content/ContentMgr');
    const content = ContentMgr.getContent(contentId);

    if (content) {
        return contentName = content.name || content.ID;
    }

    const PageMgr = require('dw/experience/PageMgr');
    const page = PageMgr.getPage(contentId);

    return contentName = page ? page.name : '';
}

function getCategoryName(category) {
    if (category.ID === 'byob') return category.ID;
    return category.displayName !== null ? category.displayName : category.custom.categorySlug;
}

function findLineItem(productId) {
    const BasketMgr = require('dw/order/BasketMgr');
    const collections = require('*/cartridge/scripts/util/collections');

    const currentBasket = BasketMgr.getCurrentBasket();
    const requestLineItem = collections.find(currentBasket.productLineItems, function (item) {
        return item.productID === productId;
    });

    return requestLineItem;
}

function getSiteSection(pageType, stageName) {
    const Resource = require('dw/web/Resource');

    let siteSection = "";
    const parentSection = getParentSection();

    switch (pageType) {
        case "plp":
            const CatalogMgr = require('dw/catalog/CatalogMgr');
            const category = CatalogMgr.getCategory(request.httpParameterMap.cgid);

            if (parentSection) {
                siteSection = category ? parentSection + " | " + getCategoryName(category) : Resource.msg('label.search.results', 'gtm', null);
            } else {
                siteSection = category ? Resource.msg('label.shop.products', 'gtm', null) + getCategoryName(category) : Resource.msg('label.search.results', 'gtm', null);
            }

            break;
        case "pdp":
            const ProductMgr = require('dw/catalog/ProductMgr');
            const product = ProductMgr.getProduct(request.httpParameterMap.pid);

            siteSection = product ? product.primaryCategory.displayName + " | " + product.name : Resource.msg('label.pick.your.snacks', 'gtm', null);;

            break;
        case "Asset":
            const contentName = getContentName(request.httpParameterMap.cid);

            if (parentSection) {
                siteSection = parentSection + " | " + contentName;
            } else {
                siteSection = contentName;
            }

            break;
        case "Folder":
            const ContentMgr = require('dw/content/ContentMgr');
            const folder = ContentMgr.getFolder(request.httpParameterMap.fdid);

            if (folder) {
                siteSection = folder.displayName;
            }
            break;
        case "Home":
        case "Cart":
            siteSection = pageType + " | " + pageType + " Page";
            break;
        case "Account":
        case "Checkout":
            siteSection = stageName ? pageType + " | " + stageName : pageType;
            break;
        default:
            siteSection = pageType;
            break;
    }
    return siteSection;
}

function getProductsForProductView(suggestions, viewData) {
    const Resource = require('dw/web/Resource');

    if (suggestions || viewData.category) {
        return {
            products: suggestions ? viewData.suggestions.product.products : viewData.cat.onlineProducts.toArray().slice(0, 3),
            listItemName:  suggestions ? Resource.msg('label.search.type.ahead', 'gtm', null) : viewData.cat.displayName
        };
    } 

    return {
        products: viewData.productSearch.productIds.map(function (productId) {
            return productId.productSearchHit.product;
        }).filter(function (product) { return product.available }).slice(0, 3),
        listItemName: Resource.msg('label.search.show.all', 'gtm', null)
    }
}

function getBonusProduct(cartBefore) {
    if (!cartBefore || !cartBefore.items || !cartBefore.hasBonusProduct) return;
    const ArrayUtils = require('*/cartridge/scripts/util/array');

    const bonusProduct = ArrayUtils.find(cartBefore.items, function (item) {
        return item.isBonusProductLineItem && item.appliedPromotions;
    });

    return bonusProduct;
}

function giftWithPurchaseEvent(productObj, bonusProduct) {
    if (bonusProduct && bonusProduct.id === productObj.id) {
        return;
    }

    if (productObj.bonusProductLineItem) {
        return {
            event: 'select_content',
            content_type: 'Gift with purchase'
        };
    }
}

function getPaymentType(viewData) {
    const Resource = require('dw/web/Resource');

    if (!viewData) {
        return;
    }

    if (viewData.paymentMethod && viewData.paymentMethod.value) {
        return Resource.msg('label.payment.method.' + viewData.paymentMethod.value, 'gtm', null);
    }

    if (viewData.gtmPaymentMethod) {
        return Resource.msg('label.payment.method.' + viewData.gtmPaymentMethod, 'gtm', null);
    }
}

function getDiscountCode(discounts) {
    if (!discounts) return;
    const ArrayUtils = require('*/cartridge/scripts/util/array');
    const discount = ArrayUtils.find(discounts, function (discount) {
        return discount.type === 'coupon';
    });
    
    return discount;
}

const GTM = {
    PAGE_TYPE: PAGE_TYPES,
    /**
     * Add page data to include GTM with cache breaking
     */
    addPageData: function () {
        const Site = require('dw/system/Site');
        const Resource = require('dw/web/Resource');

        const args = Array.prototype.slice.call(arguments);
        let stageName = '';
        if (args[0] === Resource.msg('label.account', 'gtm', null) || args[0] === Resource.msg('label.checkout', 'gtm', null)) {
            stageName = args[1];
        }
        const reqResNext = args.splice(-3);
        const pageType = args[0];
        const gtmPageData = getGTMPageData(reqResNext[1]);

        gtmPageData.pageName = Site.getCurrent().name + " | " + getSiteSection(pageType, stageName);
        removeSiteSectionCookie();
        gtmPageData.pageUrl = request.httpHost + request.httpHeaders.get('x-is-path_translated');
        gtmPageData.pageHostName = request.httpHost;
        gtmPageData.pagePath = request.httpHeaders.get('x-is-path_translated');
        gtmPageData.userState = customer.authenticated ? "Logged in" : "Not logged in";
        gtmPageData.customerID = customer.profile ? customer.profile.customerNo : customer.ID;

        if (args[0] === Resource.msg('label.checkout', 'gtm', null) && stageName !== Resource.msg('label.shipping', 'gtm', null)) {
            pushGTMEvents(reqResNext[1], [{
                event: 'pageInfo',
                page: gtmPageData
            }])
        }

        addGTMPageData(reqResNext[1], gtmPageData);

        callNext(reqResNext[2]);
    },
    /**
     * Reads data passed from setPageDataForRender and injects gtm to a page
     */
    setPageDataForRender: function (hashedData, req, res, next) {
        const pageData = parseJSON(StringUtils.decodeBase64(hashedData), {});
        const page = {
            pageName: '',
            pageUrl: '',
            pageHostName: '',
            pagePath: '',
            userState: '',
            customerID: ''
        };

        Object.keys(pageData).forEach(function (pageKey) {
            if (typeof page[pageKey] !== 'undefined') {
                page[pageKey] = pageData[pageKey];
            }
        });

        addGTMPageDataForRender(res, {
            event: 'pageInfo',
            page: page
        });

        callNext(next);
    },
    addShippingInformations: function (req, res, next) {
        const BasketMgr = require('dw/order/BasketMgr');
        const currentBasket = BasketMgr.getCurrentBasket();

        const items = currentBasket && currentBasket.productLineItems ? currentBasket.productLineItems.toArray() : null;

        if (!items || !items.length) {
            return next();
        }
        
        const ProductMgr = require('dw/catalog/ProductMgr');
        const shippingInfoObj = {
            event: 'add_shipping_info',
            ecommerce: {
                shipping_tier: items[0].shipment.shippingMethod.displayName,
                items: []
            }
        };

        items.forEach(function (item) {
            const product = ProductMgr.getProduct(item.productID);

            shippingInfoObj.ecommerce.items.push({
                item_name: product.name,
                item_id: product.ID,
                price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null, //for b2b site set null
                item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                quantity: item.quantity.value,
                item_variant: item.custom.gtmItemVariant,
                item_list_name: item.custom.gtmItemListName || ""
            });
        });
        pushGTMEvents(res, [shippingInfoObj]);
        callNext(next);
    },
    addPaymentInformations: function (req, res, next) {
        const BasketMgr = require('dw/order/BasketMgr');
        const currentBasket = BasketMgr.getCurrentBasket();

        if (empty(currentBasket) || !currentBasket.productLineItems.length) {
            return next();
        }

        const collections = require('*/cartridge/scripts/util/collections');
        const items = currentBasket.productLineItems;

        const paymentInfoObj = {
            event: 'add_payment_info',
            ecommerce: {
                payment_type: getPaymentType(res.viewData) || "",
                items: []
            }
        };

        collections.forEach(items, function (item) {
            const product = item.product;
            paymentInfoObj.ecommerce.items.push({
                item_name: product.name,
                item_id: product.ID,
                price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null, //for b2b site set null
                item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                quantity: item.quantity.value,
                item_variant: item.custom.gtmItemVariant,
                item_list_name: item.custom.gtmItemListName || ""
            });
        });
        pushGTMEvents(res, [paymentInfoObj]);
        callNext(next);
    },
    addPurchaseInformation: function (req, res, next) {
        const orderGTM = res.viewData.orderGTM;
        const order = res.viewData.order;

        if (empty(orderGTM) || empty(order)) {
            return next();
        }

        const Resource = require('dw/web/Resource');
        const collections = require('*/cartridge/scripts/util/collections');

        const items = orderGTM.productLineItems;
        const purchaseInfoObj = {
            event: 'purchase',
            ecommerce: {
                currency: orderGTM.currencyCode,
                value: order.totals.grandTotal,
                tax: order.totals.totalTax,
                shipping: order.totals.totalShippingCost,
                affiliation: Resource.msg('label.purchase.store.name', 'gtm', null),
                transaction_id: orderGTM.orderNo,
                items: []
            }
        };

        const discount = getDiscountCode(order.totals.discounts);

        if (discount) {
            purchaseInfoObj.ecommerce.coupon = discount.couponCode;
        }

        collections.forEach(items, function (item) {
            const product = item.product;
            purchaseInfoObj.ecommerce.items.push({
                item_name: product.name,
                item_id: product.ID,
                price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null, //for b2b site set null
                item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                quantity: item.quantity.value,
                item_variant: item.custom.gtmItemVariant,
                item_list_name: item.custom.gtmItemListName || ""
            });
        });
        addGTMPageDataForRender(res, purchaseInfoObj);
        callNext(next);
    },
    setProductViewList: function (req, res, next) {
        const suggestions = res.viewData.suggestions;
        const productAndListItemName = getProductsForProductView(suggestions, res.viewData);
        const products = productAndListItemName.products;
        const listItemName = productAndListItemName.listItemName;

        if (!products.length) {
            return next();
        }

        const ProductMgr = require('dw/catalog/ProductMgr');
        const productViewObj = {
            event: 'view_item_list',
            ecommerce: {
                items: []
            }
        };

        products.forEach(function (productObj) {
            const productId = suggestions ? productObj.id : productObj.ID;
            const product = ProductMgr.getProduct(productId);
            productViewObj.ecommerce.items.push({
                item_name: product.name,
                item_id: product.ID,
                price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null, //for b2b site set null
                item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                item_list_name: listItemName,
                index: products.indexOf(productObj) + 1
            });
        });
        addGTMPageDataForRender(res, productViewObj);
        callNext(next);
    },
    setCheckoutDetails: function (req, res, next) {
        const cartItems = res.viewData.items;

        if (!cartItems || !cartItems.length) {
            return next();
        }

        const beginCheckoutObj = {
            event: 'begin_checkout',
            ecommerce: {
                items: []
            }
        };

        cartItems.forEach(function (item) {
            const ProductMgr = require('dw/catalog/ProductMgr');
            const product = ProductMgr.getProduct(item.id);

            beginCheckoutObj.ecommerce.items.push({
                item_name: product.name,
                item_id: product.ID,
                price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null, //for b2b site set null
                item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                quantity: item.quantity,
                item_variant: item.gtmItemVariant,
                item_list_name: item.gtmItemListName || ""
            });
        });
        addGTMPageDataForRender(res, beginCheckoutObj);
        callNext(next);
    },
    setProductDetail: function (req, res, next) {
        const ProductMgr = require('dw/catalog/ProductMgr');
        const product = ProductMgr.getProduct(req.querystring.pid);

        if (!product) {
            return next();
        }

        const GeneralUtil = require('*/cartridge/scripts/utils/GeneralUtil');
        const itemListNameCookie = GeneralUtil.getCookie("gtmItemListName");
        const productViewObj = {
            event: 'view_item',
            ecommerce: {
                items: [
                    {
                        item_name: product.name,
                        item_id: product.ID,
                        price: product.getPriceModel().getMaxPrice().value,
                        item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                        item_list_name: itemListNameCookie ? itemListNameCookie.value : "",
                        index: 1
                    }
                ]
            }
        };

        addGTMPageDataForRender(res, productViewObj);
        callNext(next);
    },
    setCartDetails: function (req, res, next) {
        const cartItems = res.viewData.items;

        if (!cartItems || !cartItems.length) {
            return next();
        }

        const ProductMgr = require('dw/catalog/ProductMgr');
        const cartViewObj = {
            event: 'view_cart',
            ecommerce: {
                items: []
            }
        };

        cartItems.forEach(function (item) {
            const product = ProductMgr.getProduct(item.id);
            cartViewObj.ecommerce.items.push({
                item_name: product.name,
                item_id: product.ID,
                price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null, //for b2b site set null
                item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                quantity: item.quantity,
                item_variant: item.gtmItemVariant,
                item_list_name: item.gtmItemListName || ""
            });
        });
        addGTMPageDataForRender(res, cartViewObj);
        callNext(next);
    },
    initProductRemovedFromCart: function (req, res, next, productForRemove) {
        const removedProducts = res.viewData.removedProducts ? res.viewData.removedProducts : [productForRemove];;

        if (!removedProducts.length) {
             return next();
        }

        const ProductMgr = require('dw/catalog/ProductMgr');
        const removedProductObj = {
            event: 'remove_from_cart',
            ecommerce: {
                items: []
            }
        };

        removedProducts.forEach(function (productObj) {
            const productId = productForRemove ? productObj.ID : productObj.id;
            const product = ProductMgr.getProduct(productId);

            let removedLineItem;
            const passingList = res.viewData.cart && res.viewData.cart.items ? res.viewData.cart.items : res.viewData.items;

            if (passingList) {
                passingList.forEach(function (item) {
                    if (item.id === productId) {
                        return removedLineItem = item;
                    }
                });
            }

            removedProductObj.ecommerce.items.push({
                item_id: productId,
                item_name: product.name,
                price: product.getPriceModel().getMaxPrice().value,
                item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                item_variant: removedLineItem ? removedLineItem.gtmItemVariant : "",
                item_list_name: removedLineItem ? removedLineItem.gtmItemListName : "",
                index: removedProducts.indexOf(productObj) + 1,
                quantity: removedLineItem ? removedLineItem.quantity : productObj.quantity
            });
        });
        addGTMPageDataForRender(res, removedProductObj);
        callNext(next);
    },
    /**
     * Add to cart
     */
    setAddToCartProductData: function (req, res, next) {
        const productId = res.viewData.isByob ? res.viewData.boxSku : res.viewData.currentProdId;

        if (productId) {
            const ProductMgr = require('dw/catalog/ProductMgr');
            const bonusProduct = getBonusProduct(res.viewData.cartBefore);
            const gtmEvents = [];
            const product = ProductMgr.getProduct(productId);
            
            const requestLineItem = findLineItem(productId);

            const gtmGiftEvent = giftWithPurchaseEvent(requestLineItem, bonusProduct);

            if (gtmGiftEvent) {
                gtmEvents.push(gtmGiftEvent);
            }

            const productViewObj = {
                event: 'add_to_cart',
                ecommerce: {
                    items: [
                        {
                            item_id: product.ID,
                            item_name: product.name,
                            item_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                            price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null,
                            item_list_name: requestLineItem.custom ? requestLineItem.custom.gtmItemListName : "",
                            quantity: requestLineItem.quantity.value,
                            item_variant: requestLineItem.custom ? requestLineItem.custom.gtmItemVariant : "",
                            index: 1
                        }
                    ]
                }
            };
 
            gtmEvents.push(productViewObj);
            pushGTMEvents(res, gtmEvents);
        }
        if (res.viewData.isByob) {
            return;
        }
        callNext(next);
    },
    setUpdatedLineItemProductQuantity: function (req, res, next) {
        const viewData = res.viewData;
        if (!viewData.removeAdd || !viewData.currentProdId) return;
        const Resource = require('dw/web/Resource');

        if (viewData.removeAdd === Resource.msg('label.add', 'gtm', null)) {
            return GTM.setAddToCartProductData(req, res, next);
        }

        const ProductMgr = require('dw/catalog/ProductMgr');
        const productForRemove = ProductMgr.getProduct(viewData.currentProdId);
        return GTM.initProductRemovedFromCart(req, res, next, productForRemove);
    },
    byobLanding: function (req, res, next) {
        if (req.querystring.pid && req.querystring.pid === "MBYOB") {
            addGTMPageDataForRender2(res, {
                event: 'select_content',
                content_type: 'BYOB Landing Page',
                event_items: 'N/A',
                event_promotion: 'N/A'
            });
        }
        
        next();
    },
    addToBox: function (req, res, next) {
        const GeneralUtil = require('*/cartridge/scripts/utils/GeneralUtil');
        const actionGTM = res.viewData.actionGTM;
        const byobType = GeneralUtil.getCookie('gtmBYOBtype');
        const viewData = res.viewData;

        if (!actionGTM || !viewData.productList || !viewData.productList.items) {
            return next();
        }

        const Resource = require('dw/web/Resource');
        const packSize = Resource.msgf('label.snacks', 'gtm', null, viewData.productList.boxSize);
        const addToBoxEvent = {
            event: 'select_content',
            content_type: 'BYOB Add To My Box',
            event_items: [],
            event_promotion: [packSize, byobType ? byobType.value : '']
        };

        viewData.productList.items.forEach(function (item) {
            addToBoxEvent.event_items.push(item.productName);
        });

        addGTMPageDataForRender(res, addToBoxEvent);
        next();
    },
    addBoxToCart: function (req, res, next) {
        const viewData = res.viewData;

        if (!viewData.isByob || !viewData.cart.items) {
            return next();
        }

        const Resource = require('dw/web/Resource');
        const GeneralUtil = require('*/cartridge/scripts/utils/GeneralUtil');

        const packSize = GeneralUtil.getCookie('gtmBYOBsize');
        const byobType = GeneralUtil.getCookie('gtmBYOBtype');

        const addBoxToCartEvent = {
            event: 'select_content',
            content_type: 'BYOB Add Box to Cart',
            event_items: [],
            event_promotion: [packSize ? packSize.value.replace(/_/g, ' ') : '', byobType ? byobType.value : '']
        };

        viewData.cart.items.forEach(function (item) {
            if (item.isByobMaster && item.id === viewData.boxSku) {
                addBoxToCartEvent.event_items.push(item.productName);
                item.byobLineItems.forEach(function (byobItems) {
                    addBoxToCartEvent.event_items.push(byobItems.productName);
                }); 
            }
        });

        this.setAddToCartProductData(req, res, next);

        const gtmEvents = [];
        gtmEvents.push(addBoxToCartEvent);
        pushGTMEvents(res, gtmEvents);

        next();
    },
    /**
     * Utility BIND to use this as middleware and inject data in controller middleware chain
     */
    bind: function (fn) {
        const targetFn = this[fn];
        const params = Array.prototype.slice.call(arguments).slice(1); // passed params without function name
        return function () {
            targetFn.apply(GTM, params.concat(Array.prototype.slice.call(arguments))); // Middleware chain params
        };
    }
};

module.exports = GTM;
