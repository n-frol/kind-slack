'use strict';

var server = require('server');

server.get('CharitySearch', server.middleware.https, function (req, res, next) {
    var search = require('~/cartridge/scripts/changeUp/services/search');
    var config = require('~/cartridge/models/config');
    var result = {};

    if (req.querystring.query) {
        result = search({
            query: req.querystring.query,
            exclude: config.category_exclusions ? config.category_exclusions.toString() : '',
            requireVerified: config.verified_charity_flag
        });
    }

    res.json({
        results: result
    });

    next();
});

server.post('UpdateDonationConfirmation', server.middleware.https, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');
    var Locale = require('dw/util/Locale');
    var HookMgr = require('dw/system/HookMgr');

    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');

    var basket = require('dw/order/BasketMgr').currentBasket;
    var changeup = null;
    var agreed = null;
    var firstName = null;
    var lastName = null;
    var addressOne = null;
    var addressTwo = null;
    var countryCode = null;
    var city = null;
    var zipCode = null;
    var phone = null;
    var supersize = false;

    if (req.body) {
        agreed = JSON.parse(req.body).decision;
        firstName = JSON.parse(req.body).shippingForm_firtsName ? JSON.parse(req.body).shippingForm_firtsName : '';
        lastName = JSON.parse(req.body).shippingForm_lastName ? JSON.parse(req.body).shippingForm_lastName : '';
        addressOne = JSON.parse(req.body).shippingForm_addressOne ? JSON.parse(req.body).shippingForm_addressOne : '';
        addressTwo = JSON.parse(req.body).shippingForm_addressTwo ? JSON.parse(req.body).shippingForm_addressTwo : '';
        countryCode = JSON.parse(req.body).shippingForm_countryCode ? JSON.parse(req.body).shippingForm_countryCode : '';
        city = JSON.parse(req.body).shippingForm_city ? JSON.parse(req.body).shippingForm_city : '';
        zipCode = JSON.parse(req.body).shippingForm_zipCode ? JSON.parse(req.body).shippingForm_zipCode : '';
        phone =  JSON.parse(req.body).shippingForm_phone ? JSON.parse(req.body).shippingForm_phone : '';

        Transaction.wrap(function () {
            basket.custom.changeupAgreedToDonate = agreed;
            
            if(!basket.defaultShipment.shippingAddress){
                basket.defaultShipment.createShippingAddress();
            } 
            var shippingAddress = basket.defaultShipment.shippingAddress;

            if(firstName != ''){
                shippingAddress.setFirstName(firstName);
            }
            if(lastName != ''){
                shippingAddress.setLastName(lastName);
            }
            if(addressOne != ''){
                shippingAddress.setAddress1(addressOne);
            }
            if(addressTwo != ''){
                shippingAddress.setAddress2(addressTwo);
            }
            if(countryCode != ''){
                shippingAddress.setCountryCode(countryCode);
            }
            if(city != ''){
                shippingAddress.setCity(city);
            }
            if(zipCode != ''){
                shippingAddress.setPostalCode(zipCode);
            }
            if(phone != ''){
                shippingAddress.setPhone(phone);
            }

            if (!agreed) {
                var donationPLI = basket.getProductLineItems('changeup-donation');

                if (donationPLI && donationPLI.length) {
                    basket.removeProductLineItem(donationPLI[0]);
                }
                HookMgr.callHook('dw.order.calculate', 'calculate', basket);
            }
        });

        changeup = require('~/cartridge/scripts/changeUp/donation')(basket, false);
        var sp_val =   JSON.parse(req.body).supersize_value;
        changeup['supersize'] =  (sp_val >=0 && sp_val != null && sp_val != undefined) ? sp_val : undefined;
        if(changeup.supersize >= 0 &&  changeup.supersize != undefined && changeup.supersize != null){
            session.custom.supersize_value = changeup.supersize;
        }
    }
    supersize =  require('~/cartridge/scripts/changeUp/supersize')(changeup, basket, agreed);

    var orderModel = new OrderModel(basket, {
        usingMultiShipping: req.session.privacyCache.get('usingMultiShipping'),
        countryCode: Locale.getLocale(req.locale.id),
        containerView: 'basket'
    });

    orderModel.changeup = changeup;

    res.json({
        order: orderModel,
        customer: new AccountModel(req.currentCustomer),
        supersize: supersize
    });

    next();
});

server.post('SendIt', server.middleware.https, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');

    var order = require('dw/order/OrderMgr').getOrder(req.form.orderno);
    var data = {
        success: false
    };

    if (req.form.uuid && order) {
        try {
            Transaction.wrap(function () {
                order.custom.changeupDonationOrgUUID = req.form.uuid;
            });
            data.success = true;
        } catch (err) {
            data.errorObj = err;
        }
    } else {
        data.errorObj = {
            message: 'Missing organization UUID or no existing basket object'
        };
    }

    res.json(data);

    next();
});

module.exports = server.exports();
