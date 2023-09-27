module.exports = require('server/assign')(module.superModule, {
    addItemVariantAndItemListNameToProductLineItem: function (productLineItems, req) {
        const ArrayUtils = require('*/cartridge/scripts/util/array');

        const cartProductID = request.httpParameterMap.productID ? request.httpParameterMap.productID.value : null;
        const productID = cartProductID ? cartProductID : req.form.pid;
        const currentProductLineItem = ArrayUtils.find(productLineItems.toArray(), function (productLineItem) {
            return productLineItem.productID === productID;
        });

        if (currentProductLineItem) {
            const Transaction = require('dw/system/Transaction');
            const Resource = require('dw/web/Resource');
            const GeneralUtil = require('*/cartridge/scripts/utils/GeneralUtil');
            const pliCustom = currentProductLineItem.getCustom();
            let gtmItemListNameCookie = GeneralUtil.getCookie("gtmItemListName");

            Transaction.wrap(function () {
                if ((req.querystring.subscribed && req.querystring.subscribed === "1") || (cartProductID && request.httpParameters.subscribed[0] && request.httpParameters.subscribed[0] === "1")) {
                    pliCustom.gtmItemVariant = Resource.msg('label.subscription', 'gtm', null)
                } else {
                    pliCustom.gtmItemVariant = Resource.msg('label.onetime', 'gtm', null);
                }
                if (gtmItemListNameCookie) {
                    gtmItemListNameCookie = gtmItemListNameCookie.value;
                    pliCustom.gtmItemListName = gtmItemListNameCookie;
                    delete gtmItemListNameCookie;
                }
            });
        }
    }
});
