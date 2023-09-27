'use strict';

var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');

/**
 * Create a local service registry for capturing donations
 * @returns {dw.svc.Service} changeup api service
 */
function getService() {
    return require('dw/svc/LocalServiceRegistry').createService('com.changeup.api', {
        createRequest: function (svc, params) {
            svc.setRequestMethod('POST');
            svc.setURL(svc.URL + '/donation');
            svc.addHeader('x-changeup-api-key', Site.current.preferences.custom.changeupApiKey);
            svc.addHeader('content-type', 'application/json');
            return JSON.stringify(params);
        },
        parseResponse: function (svc, res) {
            return res;
        }
    });
}

module.exports = function (orders) {
    var res = {
        success: false
    };

    if (!Site.current.preferences.custom.changeupApiKey) {
        res.errorMessage = 'Missing ChangeUp API key in preferences';
        return res;
    }

    if (!orders || !orders.count) {
        res.errorMessage = 'There are no orders to process.';
        return res;
    }

    var Logger = require('dw/system/Logger');

    var order = null;
    var apiRes = null;
    var orderCache = { length: 0 };
    var params = { donations: [] };
    var result = null;

    while ((orders.hasNext()) && (orderCache.length < 25)) {
        order = orders.next();

        if (order && order.custom.changeupAgreedToDonate) {
            var userID = '';
            if(order.customerNo){
                userID = order.customerNo;
            } else {
                userID = order.customerEmail;
            }

            params.donations.push({
                cause_uuid: order.custom.changeupDonationOrgUUID,
                partner_transaction_id: order.orderNo,
                user_donation_amount_micros: Object.prototype.hasOwnProperty.call(order.custom, 'changeupDonationAmountCustomer') ?   parseFloat(order.custom.changeupDonationAmountCustomer.match(/\d+.\d{2}|0/)[0]) * 1000000 : 0,
                partner_donation_amount_micros: Object.prototype.hasOwnProperty.call(order.custom, 'changeupDonationAmountMerchant') ? parseFloat(order.custom.changeupDonationAmountMerchant.match(/\d+.\d{2}|0/)[0]) * 1000000 : 0,
                partner_attributable_user_email_address: Object.prototype.hasOwnProperty.call(order, 'customerEmail') && !empty(order.customerEmail) ? order.customerEmail : 'placeholder@kindsnacks.com',
                partner_attributable_user_id: Object.prototype.hasOwnProperty.call(order, 'customerNo') && !empty(order.customerNo) ? order.customerNo : 'placeholder',
                partner_attributable_user_first_name: Object.prototype.hasOwnProperty.call(order.custom, 'firstName') && !empty(order.custom.firstName) ? 'placeholder' : 'placeholder',
                partner_attributable_user_last_name: Object.prototype.hasOwnProperty.call(order.custom, 'lastName') && !empty(order.custom.lastName) ? 'placeholder' : 'placeholder'
            });
            orderCache[order.orderNo] = order;
            orderCache.length++;
        }
    }

    if (orderCache.length) {
        try {
            result = getService().setThrowOnError().call(params);
        } catch (e) {
            Logger.error(JSON.stringify(e));
        }

        if (result && result.ok) {
            try {
                apiRes = JSON.parse(result.object.text);
            } catch (e) {
                Logger.error(JSON.stringify(e));
                res.errorMessage = 'There is a technical issue with the reporting service';
            }

            if (apiRes && apiRes.data) {
                apiRes.data.forEach(function (el) {
                    try {
                        if (el.status_code !== 0) {
                            throw new Error('Error on order ' + el.partner_transaction_id + ': ' + el.error_message);
                        } else if (!el.changeup_transaction_uuids.length) {
                            throw new Error('Error on order ' + el.partner_transaction_id + ': changeup_transaction_uuids are empty or missing.');
                        } else {
                            Transaction.wrap(function () {
                                var currOrder = orderCache[el.partner_transaction_id];
                                currOrder.custom.changeupReportingConfirmationUUIDs = el.changeup_transaction_uuids;
                            });
                        }
                    } catch (e) {
                        Logger.error('Exception caught while reporting donations: ' + e.message);
                    }
                });

                res.success = true;
            }
        } else if (result && result.errorMessage) {
            Logger.error(result.errorMessage);
            res.errorMessage = result.errorMessage;
        }
    }
    return res;
};
