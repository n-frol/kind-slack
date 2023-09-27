function makeItem(product, itemIndex, slotName) {
    const Resource = require('dw/web/Resource');

    return {
        item_name: product.name,
        item_id: product.ID,
        price: product.getPriceModel() ? product.getPriceModel().getMaxPrice().value : null,
        item_category: product.primaryCategory.displayName,
        item_list_name: slotName ? slotName : Resource.msg('label.einstein.pdp', 'gtm', null),
        index: itemIndex
    };
}

function setRecommendationProducts(products, slotName) {
    if (products) {
        const ProductMgr = require('dw/catalog/ProductMgr');
        const collections = require('*/cartridge/scripts/util/collections');
        const productViewObj = {
            event: 'view_item_list',
            ecommerce: {
                items: []
            }
        }
        try {
            collections.forEach(products, function (productObj) {
                const product = ProductMgr.getProduct(productObj.ID);
                productViewObj.ecommerce.items.push(makeItem(product, products.indexOf(productObj) + 1, slotName));
            });
        } catch (e) {
            products.forEach(function (productObj) {
                const product = ProductMgr.getProduct(productObj.ID);
                productViewObj.ecommerce.items.push(makeItem(product, products.indexOf(productObj) + 1));
            });
        }
        return productViewObj;
    }
}

module.exports = { setRecommendationProducts: setRecommendationProducts }