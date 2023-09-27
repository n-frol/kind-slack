/* eslint-disable */
"use strict";

/**
 * RemoveTokens.js
 *
 * Removes tokens
 */

// SFCC system class imports.
var Logger = require("dw/system/Logger");

// Module level declarations.
var log = Logger.getLogger("outofstock", "outofstock");
var ProductMgr = require("dw/catalog/ProductMgr");

/**
 * Executes the migration scirpt
 */
function execute() {
    var CustomObjectMgr = require("dw/object/CustomObjectMgr");
    var Transaction = require("dw/system/Transaction");

    var cobs = CustomObjectMgr.getAllCustomObjects("NotifyMe")
        .asList()
        .toArray();

    cobs.forEach((cob) => {
        var pid = cob.custom.sku;
        var prod = ProductMgr.getProduct(pid);
        if (!prod.master) {
            var variationHelpers = require("*/cartridge/scripts/helpers/variationHelpers");
            var visibleVariants = variationHelpers.methods.getVisibleVariants(
                prod.variationModel
            );
            var canorder = visibleVariants[0].availabilityModel.orderable;
        } else {
            var canorder = prod.availabilityModel.orderable;
        }

        if (canorder) {
            var responsiveImageUtils = require("*/cartridge/scripts/util/responsiveImageUtils");
            var URLUtils = require("dw/web/URLUtils");
            var thedata = {
                purl: URLUtils.https("Product-Show", "pid", pid).toString(),
                fname: cob.custom.name.split(" ")[0],
                lname: cob.custom.name.split(" ")[1],
                pname: prod.name,
                pdesc: prod.longDescription.source,
                pimg: responsiveImageUtils.getResponsiveImage(
                    prod.getImages("large")[0],
                    600
                ).imageUrlDefault,
            };
            var KlaviyoUtils = require("*/cartridge/scripts/utils/klaviyo/KlaviyoUtils");
            KlaviyoUtils.sendEmail(
                cob.custom.email,
                {
                    purl: URLUtils.https("Product-Show", "pid", pid).toString(),
                    fname: cob.custom.name.split(" ")[0],
                    lname: cob.custom.name.split(" ")[1],
                    pname: prod.name,
                    pdesc: prod.longDescription.source,
                    pimg: responsiveImageUtils.getResponsiveImage(
                        prod.getImages("large")[0],
                        600
                    ).imageUrlDefault,
                },
                "outOfStock"
            );
            log.info("Email sent to " + cob.custom.email);
            Transaction.begin();
            CustomObjectMgr.remove(cob);
            Transaction.commit();
        } else {
            log.info("Product still out of stock: " + pid);
        }
    });
}

/** Exported functions **/
module.exports = {
    execute: execute,
};
