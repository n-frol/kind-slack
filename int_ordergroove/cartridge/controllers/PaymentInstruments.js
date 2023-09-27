"use strict";

var server = require("server");
server.extend(module.superModule);

var HookMgr = require("dw/system/HookMgr");

server.append("SavePayment", function (req, res, next) {
    this.on("route:Complete", function (req, res) {
        // eslint-disable-line no-shadow
        var viewData = res.getViewData();
        if (
            viewData.success !== false &&
            viewData.paymentForm.makeDefaultPayment.checked == true
        ) {
            var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");
            var service = LocalServiceRegistry.createService(
                "OrderGroove.PaymentUpdate",
                {
                    createRequest: function (svc, data) {
                        var customerNo = customer.getProfile().getCustomerNo();
                        var epoch = (Date.now() / 1000.0)
                            .toPrecision(10)
                            .toString();
                        var Mac = require("dw/crypto/Mac");
                        var encryptor = new Mac(Mac.HMAC_SHA_256);
                        var hashInput = customerNo + "|" + epoch;
                        var Site = require("dw/system/Site");
                        var hashKey =
                            Site.getCurrent().getCustomPreferenceValue(
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
                        var ccType = new String();
                        switch (data.cardType) {
                            case "Visa":
                                ccType = "1";
                                break;
                            case "Master":
                            case "Master Card":
                            case "MasterCard":
                                ccType = "2";
                                break;
                            case "Amex":
                                ccType = "3";
                                break;
                            case "Discover":
                                ccType = "4";
                                break;
                        }
                        paymentRequest["card_type"] = ccType;
                        var StringUtils = require("dw/util/StringUtils");
                        var ccExp =
                            StringUtils.formatNumber(
                                data.expirationMonth,
                                "00"
                            ) +
                            "/" +
                            data.expirationYear;
                        var ccExpPadded = StringUtils.pad(ccExp, 32);
                        ccExpPadded = ccExpPadded.replac(/\s/g, "{");
                        var hashKeyEncoded: String =
                            StringUtils.encodeBase64(hashKey);
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
                            "update_request=" +
                            JSON.stringify(request, null, 5);
                        return payload;
                    },
                    parseResponse: function (svc, response) {
                        return response;
                    },
                }
            );
            var result = service.call(viewData);
            var response = new String();
            var Result = require("dw/svc/Result");
            if (result.getStatus() == Result.OK) {
                response = result.getObject().getText();
            } else {
                response = result.getErrorMessage();
            }
        }
    });
    next();
});

server.append("SetDefaultPayment", function (req, res, next) {
    this.on("route:Complete", function (req, res) {
        // eslint-disable-line no-shadow
        var viewData = res.getViewData();
        var paymentInstruments = customer
            .getProfile()
            .getWallet()
            .getPaymentInstruments();
        var paymentInstrumentIterator = paymentInstruments.iterator();
        while (paymentInstrumentIterator.hasNext()) {
            var cpi = paymentInstrumentIterator.next();
            if (cpi.getUUID() === viewData.UUID) {
                break;
            }
        }
        if (HookMgr.hasHook("ordergroove.payment.update")) {
            HookMgr.callHook(
                "ordergroove.payment.update",
                "paymentUpdate",
                cpi
            );
        }
    });
    next();
});

module.exports = server.exports();
