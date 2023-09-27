'use strict';

var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var Status = require('dw/system/Status');
var config = require('int_changeup_sfra/cartridge/models/config').getConfig();

/**
 * Create a local service registry for capturing donations
 * @returns {dw.svc.Service} changeup api service
 */
function getService() {
    return require('dw/svc/LocalServiceRegistry').createService('com.changeup.api', {
        createRequest: function (svc, params) {
            svc.setRequestMethod('POST');
            svc.setURL(svc.URL + '/donation');
            svc.addHeader('x-api-key', Site.current.preferences.custom.changeupApiKey);
            svc.addHeader('content-type', 'application/json');
            return JSON.stringify(params);
        },
        parseResponse: function (svc, res) {
            return res;
        }
    });
}

function getDMSService() {
    return require('dw/svc/LocalServiceRegistry').createService('com.changeupDMS.api', {
        createRequest: function (svc, params) {
            svc.setRequestMethod('POST');
            svc.setURL(svc.URL + '/v1/donations');
            svc.addHeader('x-api-key', Site.current.preferences.custom.changeupApiKeyDMS);
            svc.addHeader('x-client-id', Site.current.preferences.custom.changeupClientIdDMS);
            svc.addHeader('content-type', 'application/json');
            return JSON.stringify(params);
        },
        parseResponse: function (svc, res) {
            return res;
        }
    });
}

function sendOrders(orders) {
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
    var problem = false;

    while ((orders.hasNext()) && (orderCache.length < 25)) {
        order = orders.next();

        if (order && order.custom.changeupAgreedToDonate) {
            var userID = '';
            if (order.customerNo) {
                userID = order.customerNo;
            } else {
                userID = order.customerEmail;
            }

            let ppd_amount_micros = (config.donation_type_salesUplift) ? parseFloat(order.custom.changeupDonationAmountMerchantSalesUplift.match(/\d+.\d{2}|0/)[0]) * 1000000 : null;
            let ppd_cause_uuid = (config.donation_type_salesUplift) ? order.custom.changeupDonationSalesUpliftOrgUUID : null;

            params.donations.push({
                user_donation_amount_micros: parseFloat(order.custom.changeupDonationAmountCustomer.match(/\d+.\d{2}|0/)[0]) * 1000000,
                partner_donation_amount_micros: parseFloat(order.custom.changeupDonationAmountMerchant.match(/\d+.\d{2}|0/)[0]) * 1000000,
                partner_transaction_id: order.orderNo,
                cause_uuid: order.custom.changeupDonationOrgUUID,
                partner_attributable_user_id: userID,
                partner_attributable_user_email_address: order.customerEmail,
                product_page_donation_amount_micros: ppd_amount_micros,
                product_page_donation_cause_uuid: ppd_cause_uuid
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
            problem = true;
        }

        if (result && result.ok) {
            try {
                apiRes = JSON.parse(result.object.text);
            } catch (e) {
                Logger.error(JSON.stringify(e));
                res.errorMessage = 'There is a technical issue with the reporting service';
                problem = true;
            }

            if (apiRes && apiRes.data) {
                apiRes.data.forEach(function (el) {
                    try {
                        if (el.status_code !== 0) {
                            throw new Error('Error on order ' + el.partner_transaction_id + ': ' + el.error_message);
                            problem = true;
                        } else if (!el.changeup_transaction_uuids.length) {
                            throw new Error('Error on order ' + el.partner_transaction_id + ': changeup_transaction_uuids are empty or missing.');
                            problem = true;
                        } else {
                            var currOrder = orderCache[el.partner_transaction_id];
                            Transaction.wrap(function () {
                                currOrder.custom.changeupReportingConfirmationUUIDs = el.changeup_transaction_uuids;
                            });
                            Logger.info('SUCCESS: {0} - changeupReportingConfirmationUUIDs: {1}', el.partner_transaction_id, el.changeup_transaction_uuids.toString());

                        }
                    } catch (e) {
                        Logger.error('Exception caught while reporting donations: ' + e.message);
                        problem = true;
                    }
                });
                if (apiRes.invalid_donations.length) {
                    let invalid_donation = '';
                    for (let i = 0; i < apiRes.invalid_donations.length; i++) {
                        if (apiRes.invalid_donations[i].changeup_transaction_uuid) {
                            Transaction.wrap(function () {
                                var currOrder = orderCache[apiRes.invalid_donations[i].donation.partner_transaction_id];
                                currOrder.custom.changeupReportingConfirmationUUIDs = [apiRes.invalid_donations[i].changeup_transaction_uuid];
                                Logger.info('SUCCESS: changeupReportingConfirmationUUIDs: {0} was assigned to order - {1} ', apiRes.invalid_donations[i].changeup_transaction_uuid.toString(), currOrder.currentOrderNo);
                            });
                        } else {
                            invalid_donation = 'FAILED: ' + apiRes.invalid_donations[i].donation.partner_transaction_id + ' : ' + apiRes.invalid_donations[i].error;
                            Logger.warn('{0}', invalid_donation);
                        }
                    }

                }
                res.success = true;
            }
        } else if (result && result.errorMessage) {
            Logger.error(result.errorMessage);
            res.errorMessage = result.errorMessage;
            return new Status(Status.ERROR, 'ERROR');
        }
        if (problem) {
            return new Status(Status.ERROR, 'ERROR');
        }
    }
    return res;
}

function sendOrder(order) {
    var res = {
        success: false
    };

    if (!Site.current.preferences.custom.changeupApiKey) {
        res.errorMessage = 'Missing ChangeUp API key in preferences';
        return res;
    }

    var Logger = require('dw/system/Logger');

    var apiRes = null;
    var params = { donations: [] };
    var result = null;
    var problem = false;


        if (order && order.custom.changeupAgreedToDonate) {
            var userID = '';
            if (order.customerNo) {
                userID = order.customerNo;
            } else {
                userID = order.customerEmail;
            }

            let ppd_amount_micros = (config.donation_type_salesUplift) ? parseFloat(order.custom.changeupDonationAmountMerchantSalesUplift.match(/\d+.\d{2}|0/)[0]) * 1000000 : null;
            let ppd_cause_uuid = (config.donation_type_salesUplift) ? order.custom.changeupDonationSalesUpliftOrgUUID : null;

            params.donations.push({
                user_donation_amount_micros: parseFloat(order.custom.changeupDonationAmountCustomer.match(/\d+.\d{2}|0/)[0]) * 1000000,
                partner_donation_amount_micros: parseFloat(order.custom.changeupDonationAmountMerchant.match(/\d+.\d{2}|0/)[0]) * 1000000,
                partner_transaction_id: order.orderNo,
                cause_uuid: order.custom.changeupDonationOrgUUID,
                partner_attributable_user_id: userID,
                partner_attributable_user_email_address: order.customerEmail,
                product_page_donation_amount_micros: ppd_amount_micros,
                product_page_donation_cause_uuid: ppd_cause_uuid
            });
        }


        try {
            result = getService().setThrowOnError().call(params);
        } catch (e) {
            Logger.error(JSON.stringify(e));
            problem = true;
        }

        if (result && result.ok) {
            try {
                apiRes = JSON.parse(result.object.text);
            } catch (e) {
                Logger.error(JSON.stringify(e));
                res.errorMessage = 'There is a technical issue with the reporting service';
                problem = true;
            }

            if (apiRes && apiRes.data) {
                apiRes.data.forEach(function (el) {
                    try {
                        if (el.status_code !== 0) {
                            throw new Error('Error on order ' + el.partner_transaction_id + ': ' + el.error_message);
                            problem = true;
                        } else if (!el.changeup_transaction_uuids.length) {
                            throw new Error('Error on order ' + el.partner_transaction_id + ': changeup_transaction_uuids are empty or missing.');
                            problem = true;
                        } else {
                            Transaction.wrap(function () {
                                order.custom.changeupReportingConfirmationUUIDs = el.changeup_transaction_uuids;
                            });
                            Logger.info('SUCCESS: {0} - changeupReportingConfirmationUUIDs: {1}', el.partner_transaction_id, el.changeup_transaction_uuids.toString());

                        }
                    } catch (e) {
                        Logger.error('Exception caught while reporting donations: ' + e.message);
                        problem = true;
                    }
                });
                if (apiRes.invalid_donations.length) {
                    let invalid_donation = '';
                    for (let i = 0; i < apiRes.invalid_donations.length; i++) {
                        if (apiRes.invalid_donations[i].changeup_transaction_uuid) {
                            Transaction.wrap(function () {
                                order.custom.changeupReportingConfirmationUUIDs = [apiRes.invalid_donations[i].changeup_transaction_uuid];
                                Logger.info('SUCCESS: changeupReportingConfirmationUUIDs: {0} was assigned to order - {1} ', apiRes.invalid_donations[i].changeup_transaction_uuid.toString(), order.currentOrderNo);
                            });
                        } else {
                            invalid_donation = 'FAILED: ' + apiRes.invalid_donations[i].donation.partner_transaction_id + ' : ' + apiRes.invalid_donations[i].error;
                            Logger.warn('{0}', invalid_donation);
                        }
                    }

                }
                res.success = true;
            }
        } else if (result && result.errorMessage) {
            Logger.error(result.errorMessage);
            res.errorMessage = result.errorMessage;
            return new Status(Status.ERROR, 'ERROR');
        }
        if (problem) {
            return new Status(Status.ERROR, 'ERROR');
        }
    
    return res;
}


/**
 * Wraps the order in an array as expected by orderS
 */
function sendOrderDMS(order) {
    var Logger = require('dw/system/Logger');
    var log = Logger.getLogger('bm_changeup', 'argano');
    var apiRes = null;
    var params = { donations: [] };
    var result = null;
    var problem = false;
    let DMSUserID = '0';
    let DMSPartnerID = '00';
    var res = {
        success: false
    };

    if (!Site.current.preferences.custom.changeupApiKey) {
        res.errorMessage = 'Missing ChangeUp API key in preferences';
        log.error("Missing ChangeUp API key in preferences");
        return res;
    }

    if (order && order.custom.changeupAgreedToDonate) {
        var userID = (order.customerNo) ? order.customerNo : order.customerEmail;
        var orderDate = new Date(order.creationDate).toISOString();
        
        var supersize = Number.parseFloat(order.custom.changeupSupersizeAmountCustomer.match(/\d+.\d{2}|0/)[0]).toFixed(2);

        params.donations.push({
            userDonationAmount: Number.parseFloat(order.custom.changeupDonationAmountCustomer.match(/\d+.\d{2}|0/)[0]).toFixed(2),
            partnerDonationAmount: Number.parseFloat(order.custom.changeupDonationAmountMerchant.match(/\d+.\d{2}|0/)[0]).toFixed(2),
            transactionId: order.orderNo,
            causeId: order.custom.changeupDonationOrgUUID,
            customerId: userID,
            delayReportBy: 0,
            widget: Site.current.preferences.custom.widgetId,
            transactionOrderDate: orderDate,
            email: order.customerEmail,
            superSized : supersize
        });
    }

    log.debug("POST, parameters " + JSON.stringify(params));

    try {
        result = getDMSService().setThrowOnError().call(params);
        log.debug("getDMSService().setThrowOnError().call " + result);
    } catch (e) {
        log.error(JSON.stringify(e));
        problem = true;
    }

    Transaction.wrap(function () {
        order.custom.changeupDMSresponse = result.object.text;
    });
    if (result && result.ok) {
        log.debug('result {0}', result.object.text);
        try {
            apiRes = JSON.parse(result.object.text);
        } catch (e) {
            log.error(JSON.stringify(e));
            res.errorMessage = 'There is a technical issue with the reporting service';
            problem = true;
        }

        apiRes.forEach(function (aDonation) {
            if (aDonation.success && aDonation.statusCode === 200) {
                if (aDonation.type == 'user') { DMSUserID = aDonation.id; }
                if (aDonation.type == 'partner') { DMSPartnerID = aDonation.id; }
            }
        });

        Transaction.wrap(function () {
            order.custom.changeupDMSuserID = DMSUserID;
            order.custom.changeupDMSpartnerID = DMSPartnerID; 
        });

        log.debug('changeupDMSuserID: {0}  changeupDMSpartnerID: {1}', DMSUserID, DMSPartnerID);

        res.success = true;
    } else if (result && result.errorMessage) {
        log.error(result.errorMessage);
        res.errorMessage = result.errorMessage;
        return new Status(Status.ERROR, 'ERROR');
    } else {
        log.error("!! Which Condition is this?");
    }

    if (problem) {
        log.error("if Problem true");
        return new Status(Status.ERROR, 'ERROR');
    }

    return res;
}

module.exports = {
    sendOrderDMS: sendOrderDMS,
    sendOrder: sendOrder,
    sendOrders: sendOrders
};