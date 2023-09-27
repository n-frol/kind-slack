/* eslint-disable */
"use strict";

/**
 * @module payment.js
 *
 * This javascript file implements methods (via Common.js exports) that are needed by
 * the account section.  This allows OCAPI calls to reference
 * these tools via the OCAPI 'hook' mechanism
 *
 */

var Logger = require("dw/system/Logger");
var Site = require("dw/system/Site");
var Status = require("dw/system/Status");

/**
 * @function updatePayment
 *
 * Function updates the payment record in OrderGroove
 *
 * @param {object} cpi    The customer payment instrument
 */
exports.paymentUpdate = function (cpi) {
    if (
        empty(
            Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")
        ) ||
        Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == false
    ) {
        return new Status(Status.OK);
    }
    var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
    var ogLog = Logger.getLogger("order-groove", "OG");

    var service = LocalServiceRegistry.createService(
        "OrderGroove.PaymentUpdate",
        {
            createRequest: function (svc, cpi) {
                var customerNo = customer.getProfile().getCustomerNo();
                var epoch = (Date.now() / 1000.0).toPrecision(10).toString();
                var Mac = require("dw/crypto/Mac");
                var encryptor = new Mac(Mac.HMAC_SHA_256);
                var hashInput = customerNo + "|" + epoch;
                var Site = require("dw/system/Site");
                var hashKey = Site.getCurrent().getCustomPreferenceValue(
                    "OrderGrooveMerchantHashKey"
                );
                var hashBytes = encryptor.digest(hashInput, hashKey);
                var Encoding = require("dw/crypto/Encoding");
                var hash = Encoding.toURI(Encoding.toBase64(hashBytes));
                var request = new Object();
                request["merchant_id"] =
                    Site.getCurrent().getCustomPreferenceValue(
                        "OrderGrooveMerchantID"
                    );
                var userRequest: Object = new Object();
                userRequest["user_id"] = customerNo;
                userRequest["ts"] = epoch;
                userRequest["sig"] = hash;
                request["user"] = userRequest;
                var paymentRequest = new Object();
                if (cpi.getPaymentMethod() === "PayPal") {
                    paymentRequest["label"] = "PayPal";
                    var ccHolder = customer.getProfile().getEmail();
                    var padAmount: Number = 32 - (ccHolder.length % 32);
                    var StringUtils = require("dw/util/StringUtils");
                    var padFill: String = StringUtils.pad(ccExp, 32).replace(
                        /\s/g,
                        "{"
                    );
                    ccHolder += padFill;
                    var hashKeyEncoded: String =
                        StringUtils.encodeBase64(hashKey);
                    var Cipher = require("dw/crypto/WeakCipher");
                    var ccHolderEncrypted: String = new Cipher().encrypt(
                        ccHolder,
                        hashKeyEncoded,
                        "AES/ECB/NOPADDING",
                        "",
                        0
                    );
                    paymentRequest["cc_holder"] =
                        Encoding.toURI(ccHolderEncrypted);
                }
                if (cpi.getPaymentMethod() !== "PayPal") {
                    var ccType = new String();
                    switch (cpi.getCreditCardType().toUpperCase()) {
                        case "VISA":
                            ccType = "1";
                            break;
                        case "MASTER":
                        case "MASTER CARD":
                        case "MASTERCARD":
                            ccType = "2";
                            break;
                        case "AMEX":
                        case "AMERICAN EXPRESS":
                            ccType = "3";
                            break;
                        case "DISCOVER":
                            ccType = "4";
                            break;
                        case "DINERS":
                            ccType = "5";
                            break;
                        case "JCB":
                            ccType = "6";
                            break;
                    }
                    paymentRequest["card_type"] = ccType;
                }
                var StringUtils = require("dw/util/StringUtils");
                if (cpi.getPaymentMethod() === "PayPal") {
                    var ccExp = "12/2099";
                } else {
                    var ccExp =
                        StringUtils.formatNumber(
                            cpi.getCreditCardExpirationMonth(),
                            "00"
                        ) +
                        "/" +
                        cpi.getCreditCardExpirationYear();
                }
                var ccExpPadded = StringUtils.pad(ccExp, 32);
                ccExpPadded = ccExpPadded.replace(/\s/g, "{");
                var hashKeyEncoded: String = StringUtils.encodeBase64(hashKey);
                var Cipher = require("dw/crypto/WeakCipher");
                var ccExpEncrypted = new Cipher().encrypt(
                    ccExpPadded,
                    hashKeyEncoded,
                    "AES/ECB/NOPADDING",
                    "",
                    0
                );
                ccExpEncrypted = Encoding.toURI(ccExpEncrypted);
                paymentRequest["cc_exp_date"] = ccExpEncrypted;
                request["payment"] = paymentRequest;
                var payload: String =
                    "update_request=" + JSON.stringify(request, null, 5);

                ogLog.info("OrderGroove Payment Request - Raw: {0}", payload);
                return payload;
            },
            parseResponse: function (svc, response) {
                // Log the response.
                if (typeof response === "object") {
                    ogLog.info(
                        "OrderGroove Payment Response - Raw: {0}",
                        JSON.stringify(response)
                    );
                }
                return response;
            },
        }
    );
    var result = service.call(cpi);
    var response = new String();
    var Result = require("dw/svc/Result");
    if (result.getStatus() == Result.OK) {
        response = result.getObject().getText();
    } else {
        response = result.getErrorMessage();
    }

    // Log the response.
    ogLog.info(
        "OrderGroove Payment Response - returned from service: {0}",
        response
    );
    return new Status(Status.OK);
};
