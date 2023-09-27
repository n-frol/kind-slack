const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('AddProduct', function (req, res, next) {
    const currentBasket = require('dw/order/BasketMgr').getCurrentBasket();

    if (!empty(currentBasket)) {
        const cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        const CartModel = require('*/cartridge/models/cart');

        res.json({
            cartBefore: new CartModel(currentBasket),
        });
    }
    next();
});

server.append('AddProduct', function (req, res, next) {
    const currentBasket = require('dw/order/BasketMgr').getCurrentBasket();

    if (!empty(currentBasket)) {
        const cartHelper = require('*/cartridge/scripts/cart/cartHelpers');

        cartHelper.addItemVariantAndItemListNameToProductLineItem(currentBasket.allProductLineItems, req);
        res.json({
            currentProdId: req.form.pid,
        });
    }
    next();
}, GTM.bind("setAddToCartProductData"));

server.prepend('Show', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CART));

server.append('Show', function (req, res, next) {
    next();
}, GTM.bind('setCartDetails'));

server.prepend('Get', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CART));

server.prepend('RemoveProductLineItem', function (req, res, next) {
    const BasketMgr = require('dw/order/BasketMgr');
    const currentBasket = BasketMgr.getCurrentBasket();

    if (!empty(currentBasket)) {
        const CartModel = require('*/cartridge/models/cart');

        res.json({
            cart: new CartModel(currentBasket),
        });
    }

    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CART));

server.append('RemoveProductLineItem', function (req, res, next) {
    next();
}, GTM.bind('initProductRemovedFromCart'));

server.prepend('UpdateQuantity', function (req, res, next) {
    const Resource = require('dw/web/Resource');
    const BasketMgr = require('dw/order/BasketMgr');
    const collections = require('*/cartridge/scripts/util/collections');

    const currentBasket = BasketMgr.getCurrentBasket();
    const requestLineItem = collections.find(currentBasket.productLineItems, function (item) {
        return item.productID === req.querystring.pid;
    });
    const viewData = res.getViewData();
    let removeOrAdd;

    if (req.querystring.quantity > requestLineItem.quantity) {
        removeOrAdd = Resource.msg('label.add', 'gtm', null);
    } else if (req.querystring.quantity < requestLineItem) {
        removeOrAdd = Resource.msg('label.remove', 'gtm', null)
    }

    if (removeOrAdd) {
        viewData.removeAdd = removeOrAdd;
    }

    viewData.currentProdId = requestLineItem.productID;
    res.setViewData(viewData);
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CART));

server.post('UpdateProductSubscription', function (req, res, next) {
    const BasketMgr = require('dw/order/BasketMgr');
    const currentBasket = BasketMgr.getCurrentBasket();

    if (!empty(currentBasket)) {
        const cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        const CartModel = require('*/cartridge/models/cart');

        cartHelper.addItemVariantAndItemListNameToProductLineItem(currentBasket.allProductLineItems, req);
        res.json({
            cart: new CartModel(currentBasket),
        });
    }

    next();
}, GTM.bind("setAddToCartProductData"));

server.append('UpdateQuantity', function (req, res, next) {
    next();
}, GTM.bind('setUpdatedLineItemProductQuantity'));

server.prepend('SelectShippingMethod', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CART));

server.prepend('GetProduct', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CART));

server.prepend('EditProductLineItem', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CART));

module.exports = server.exports();
