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
// eslint-disable-next-line
/**
 * Data which is rendered in tiktok.isml from Page-TIKTOK
 * @param res Response
 * @param data Object to inject to res.tiktokPageData
 */
function addTIKTOKPageDataForRender(res, data) {
    if (!res.viewData.tiktokPageData) {
        res.viewData.tiktokPageData = {};
    }
    res.viewData.tiktokPageData = assign(res.viewData.tiktokPageData, data);
}
const TIKTOK = {
    PAGE_TYPE: PAGE_TYPES,
    // eslint-disable-next-line
    /**
     * Reads data passed from setPageDataForRender and injects tiktok to a page
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

        addTIKTOKPageDataForRender(res, {
            event: 'pageInfo',
            page: page
        });

        callNext(next);
        // eslint-disable-next-line
    },
    // eslint-disable-next-line
    addPurchaseInformation: function (req, res, next) {
        const orderTIKTOK = res.viewData.orderTIKTOK;
        const order = res.viewData.order;
        // eslint-disable-next-line
        if (empty(orderTIKTOK) || empty(order)) {
            return next();
        }

        const collections = require('*/cartridge/scripts/util/collections');

        const items = orderTIKTOK.productLineItems;
        const purchaseInfoObj = {
            contents: [],
            value: order.totals.grandTotal.replace(/\$/g, ""),
            currency: 'USD'
        };

        collections.forEach(items, function (item) {
            const product = item.product;
            purchaseInfoObj.contents.push({
                content_type: 'product',
                content_name: product.name,
                content_id: product.ID,
                price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null, // for b2b site set null
                content_category: product.primaryCategory ? product.primaryCategory.displayName : product.masterProduct.primaryCategory.displayName,
                quantity: item.quantity.value
            });
        });
        addTIKTOKPageDataForRender(res, purchaseInfoObj);
        callNext(next);
    },
    // eslint-disable-next-line
    /**
     * Utility BIND to use this as middleware and inject data in controller middleware chain
     */
    bind: function (fn) {
        const targetFn = this[fn];
        const params = Array.prototype.slice.call(arguments).slice(1); // passed params without function name
        return function () {
            targetFn.apply(TIKTOK, params.concat(Array.prototype.slice.call(arguments))); // Middleware chain params
        };
    }
};

module.exports = TIKTOK;
