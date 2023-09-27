/* global empty, response */

'use strict';

// SFCC API includes
var URLUtils = require('dw/web/URLUtils');

// SFRA Includes
var server = require('server');
var Transaction = require('dw/system/Transaction');
var BasketMgr = require('dw/order/BasketMgr');
var HookMgr = require('dw/system/HookMgr');
var Logger = require('dw/system/Logger');
var ShippingHelpers = require('app_storefront_base/cartridge/scripts/checkout/shippingHelpers');
var customShippingHelpers = require('*/cartridge/scripts/checkout/customShippingHelpers');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var customCOHelpers = require('*/cartridge/scripts/checkout/customCheckoutHelpers');

server.extend(module.superModule);

server.append('UpdateShippingMethodsList', function (req, res, next) {
    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var viewData = res.getViewData();

    var currentCustomer = req.currentCustomer;

    var currentBasket = BasketMgr.getCurrentBasket();
    var shipmentUUID = req.querystring.shipmentUUID || req.form.shipmentUUID;
    var shipment;
    if (shipmentUUID) {
        shipment = ShippingHelpers.getShipmentByUUID(currentBasket, shipmentUUID);
    } else {
        shipment = currentBasket.defaultShipment;
    }

    viewData.giftTo = req.form.giftTo;
    viewData.giftFrom = req.form.giftFrom;
    viewData.giftMessage = req.form.giftMessage;
    viewData.isGift = !empty(viewData.giftTo) || !empty(viewData.giftFrom) || !empty(viewData.giftMessage);

    res.setViewData(viewData);

    this.on('route:BeforeComplete', function (beforeCompleteReq, beforeCompleteRes) {
        var shippingData = beforeCompleteRes.getViewData();
        try {
            Transaction.wrap(function () {
                var shippingAddress = shipment.shippingAddress;

                if (!shippingAddress) {
                    shippingAddress = shipment.createShippingAddress();
                }
                shippingAddress.custom.email = beforeCompleteReq.form.email || '';
            });
        } catch (err) {
            beforeCompleteRes.setStatusCode(500);
            beforeCompleteRes.json({
                error: true,
                errorMessage: err
            });
            return;
        }

        var giftResult = COHelpers.setGift(
            shipment,
            shippingData.isGift,
            shippingData.giftTo,
            shippingData.giftFrom,
            shippingData.giftMessage
        );

        if (giftResult.error) {
            beforeCompleteRes.json({
                error: giftResult.error,
                fieldErrors: [],
                serverErrors: [giftResult.errorMessage]
            });
            return;
        }

        var usingMultiShipping = beforeCompleteReq.session.privacyCache.get('usingMultiShipping');
        var currentLocale = Locale.getLocale(beforeCompleteReq.locale.id);

        var basketModel = new OrderModel(
            currentBasket,
            { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
        );

        var shipping = customShippingHelpers.getShippingModels(currentBasket, currentCustomer.raw, 'basket');
        basketModel.shipping = shipping;

        beforeCompleteRes.json({
            customer: new AccountModel(beforeCompleteReq.currentCustomer),
            order: basketModel
        });
    });


    next();
});
server.append('SelectShippingMethod', server.middleware.https, function (req, res, next) {
    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var viewData = res.getViewData();

    var currentBasket = BasketMgr.getCurrentBasket();
    var currentCustomer = currentBasket.customer;
    var shipmentUUID = req.querystring.shipmentUUID || req.form.shipmentUUID;
    var shipment;
    if (shipmentUUID) {
        shipment = ShippingHelpers.getShipmentByUUID(currentBasket, shipmentUUID);
    } else {
        shipment = currentBasket.defaultShipment;
    }

    viewData.giftTo = req.form.giftTo || null;
    viewData.giftFrom = req.form.giftFrom || null;

    res.setViewData(viewData);

    this.on('route:BeforeComplete', function (beforeCompleteReq, beforeCompleteRes) {
        var shippingData = beforeCompleteRes.getViewData();
        try {
            Transaction.wrap(function () {
                var shippingAddress = shipment.shippingAddress;

                if (!shippingAddress) {
                    shippingAddress = shipment.createShippingAddress();
                }
                shippingAddress.custom.email = beforeCompleteReq.form.email || '';
            });
        } catch (err) {
            beforeCompleteRes.setStatusCode(500);
            beforeCompleteRes.json({
                error: true,
                errorMessage: err
            });

            return;
        }


        var giftResult = COHelpers.setGift(
            shipment,
            shippingData.isGift,
            shippingData.giftTo,
            shippingData.giftFrom,
            shippingData.giftMessage
        );

        if (giftResult.error) {
            beforeCompleteRes.json({
                error: giftResult.error,
                fieldErrors: [],
                serverErrors: [giftResult.errorMessage]
            });
            return;
        }

        var usingMultiShipping = beforeCompleteReq.session.privacyCache.get('usingMultiShipping');
        var currentLocale = Locale.getLocale(beforeCompleteReq.locale.id);

        var basketModel = new OrderModel(
            currentBasket,
            { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
        );

        var shipping = customShippingHelpers.getShippingModels(currentBasket, currentCustomer, 'basket');
        basketModel.shipping = shipping;

        beforeCompleteRes.json({
            customer: new AccountModel(beforeCompleteReq.currentCustomer),
            order: basketModel
        });
    });


    return next();
});

server.append('SubmitShipping', function (req, res, next) {
    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');
    var Resource = require('dw/web/Resource');
    var Locale = require('dw/util/Locale');
    var HTTPClient = require('dw/net/HTTPClient');
    var viewData = res.getViewData();
    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString(),
            test: Resource.msg('info.cart.redirect.msg', 'cart', null)
        });
        return next();
    }

    var form = server.forms.getForm('shipping');

    // verify shipping form data
    /*
        Mutation of the data
        @description: Upgraded SFCC added form boolean field control if mandatory true.
        The following code is bypassing the validation.
        In this case liftgate is mendatory for b2b site but not for others.
        I added the site control to bypass the validation for diferent than b2b sites.
     */
    var shippingAdress = form.shippingAddress;
    /*
     I closed following section because it's already production issue.
     will fix latter.
     */
    // var weight = customShippingHelpers.orderWeight(currentBasket);
    var currentSite = dw.system.Site.getCurrent().getID(); //eslint-disable-line
    var totalWeight = 0;
    var pliCollection = currentBasket.getAllLineItems();
    pliCollection.toArray().forEach(function (lineItem) {
        if (Object.prototype.hasOwnProperty.call(lineItem, 'product')) {
            if (Object.prototype.hasOwnProperty.call(lineItem.product, 'custom')) {
                if (Object.prototype.hasOwnProperty.call(lineItem.product.custom, 'weight')) {
                    var weight = lineItem.product.custom.weight;
                    totalWeight += (weight * lineItem.getQuantity());
                }
            }
        }
    });
    if (currentSite !== "kind_b2b" || (currentSite === 'kind_b2b' && totalWeight < 150)) {
        shippingAdress.liftgate.mandatory = false;
        shippingAdress.liftgate.valid = true;
    }

    if (shippingAdress.liftgate.selectedOption !== '') {
        shippingAdress.liftgate.mandatory = false;
        shippingAdress.liftgate.valid = true;
    }
    var shippingFormErrors = COHelpers.validateShippingForm(shippingAdress);

    if (shippingFormErrors.hasOwnProperty("dwfrm_shipping_shippingAddress_liftgate")) { //eslint-disable-line
        shippingFormErrors.dwfrm_shipping_shippingAddress_liftgate = Resource.msg('error.message.required', 'forms', null);
    }

    // set basket email address for guest customers
    if (!req.currentCustomer.raw.isAuthenticated() && form.shippingAddress.addressFields.email.value) {
        Transaction.wrap(function () {
            currentBasket.setCustomerEmail(form.shippingAddress.addressFields.email.value);
        });
    }


    if (Object.keys(shippingFormErrors).length > 0) {
        req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'invalid');

        res.json({
            form: form,
            fieldErrors: [shippingFormErrors],
            serverErrors: [],
            error: true
        });
    } else {
        viewData.address.companyName = form.shippingAddress.addressFields.companyName.value || null;
        viewData.giftTo = form.shippingAddress.giftTo.value;
        viewData.giftFrom = form.shippingAddress.giftFrom.value;
        viewData.giftMessage = form.shippingAddress.giftMessage.value;
        viewData.isGift = !empty(viewData.giftTo) || !empty(viewData.giftFrom) || !empty(viewData.giftMessage);
        viewData.liftgate = form.shippingAddress.liftgate.htmlValue;
        viewData.deliveryinstruct = form.shippingAddress.deliveryinstruct.htmlValue;
        viewData.email = form.shippingAddress.addressFields.email.value || null;

        res.setViewData(viewData);

        this.on('route:BeforeComplete', function (beforeCompleteReq, beforeCompleteRes) {
            var shippingData = beforeCompleteRes.getViewData();
            var shippingAddress;
            var usingMultiShipping = beforeCompleteReq.session.privacyCache.get('usingMultiShipping');
            var currentLocale = Locale.getLocale(beforeCompleteReq.locale.id);
            var accountModel = new AccountModel(beforeCompleteReq.currentCustomer);
            var basketModel = new OrderModel(
                currentBasket,
                { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
            );

            try {
                Transaction.wrap(function () {
                    shippingAddress = currentBasket.defaultShipment.shippingAddress;

                    if (!shippingAddress) {
                        shippingAddress = currentBasket.defaultShipment.createShippingAddress();
                    }

                    shippingAddress.setCompanyName(shippingData.address.companyName);
                    shippingAddress.custom.email = shippingData.email || '';
                    currentBasket.setCustomerEmail(shippingAddress.custom.email);
                });
            } catch (err) {
                beforeCompleteRes.setStatusCode(500);
                beforeCompleteRes.json({
                    error: true,
                    errorMessage: err,
                    order: basketModel,
                    customer: accountModel,
                    test: 'transaction fail'
                });

                return;
            }

            var giftResult = COHelpers.setGift(
                currentBasket.defaultShipment,
                shippingData.isGift,
                shippingData.giftTo,
                shippingData.giftFrom,
                shippingData.giftMessage
            );

            customCOHelpers.setLiftGate(
                currentBasket.defaultShipment,
                shippingData.liftgate,
                shippingData.deliveryinstruct
            );

            var shipping = customShippingHelpers.getShippingModels(currentBasket, currentBasket.customer, 'basket');
            basketModel.shipping = shipping;

            if (giftResult.error) {
                beforeCompleteRes.json({
                    error: giftResult.error,
                    fieldErrors: [],
                    serverErrors: [giftResult.errorMessage],
                    order: basketModel,
                    customer: accountModel,
                    test: 'gift error2'
                });
                return;
            }

            var isExpressCheckout = beforeCompleteReq.session.privacyCache.get('PaypalExpressData')
                || beforeCompleteReq.session.privacyCache.get('MasterPassQuickCheckoutData');


            form = server.forms.getForm('shipping');
            if (form.profileFields.customer.addtoemaillist.value) {
                if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
                    const hookID = 'app.klaviyo.mailingList.subscribe';
                    if (HookMgr.hasHook(hookID)) {
                        let hookResult = HookMgr.callHook(
                            hookID,
                            'subscribeToList',
                            {
                                action: "checkout",
                                source: "Checkout Page",
                                first_name: form.shippingAddress.addressFields.firstName.value,
                                last_name: form.shippingAddress.addressFields.lastName.value,
                                address1: form.shippingAddress.addressFields.address1.value,
                                address2: form.shippingAddress.addressFields.address2.value,
                                city: form.shippingAddress.addressFields.city.value,
                                state: form.shippingAddress.addressFields.states.stateCode.value,
                                zip: form.shippingAddress.addressFields.postalCode.value,
                                organization: form.shippingAddress.addressFields.companyName.value,
                                email: form.shippingAddress.addressFields.email.value
                            });
                        if (hookResult) {
                            if (HookMgr.hasHook('app.kind.yotpo.loyalty.newsletter')) {
                                HookMgr.callHook('app.kind.yotpo.loyalty.newsletter', 'newsletter', form.shippingAddress.addressFields.email.value);
                            }
                        }
                    }
                }
            }

            beforeCompleteRes.json({
                customer: new AccountModel(beforeCompleteReq.currentCustomer),
                order: basketModel,
                form: server.forms.getForm('shipping'),
                expressCheckout: isExpressCheckout ? 1 : 0
            });
            var reportingLog = Logger.getLogger('reportingEvent', 'reportingEvent');
            var reportingURL = URLUtils.https('ReportingEvent-Start',
                'ID', 'Checkout',
                'BasketID', currentBasket.UUID,
                'Step', '3',
                'Name', 'PaymentMethod'
            );
            var httpClient = new HTTPClient();
            httpClient.open('GET', reportingURL.toString());
            httpClient.setTimeout(3000);
            httpClient.send();
            if (httpClient.statusCode !== 200) {
                var infoMsg = 'Checkout Payment Method Reporting event failed:\n' +
                    'BasketID: {0}\n' +
                    'Address: {1}\n' +
                    'Text: {2}';
                reportingLog.warn(infoMsg, currentBasket.UUID, reportingURL.toString(), httpClient.text);
            }
        });
    }

    return next();
});

/**
 * Extends the base endpoint by returning an error and redirect to the cart if
 * the endpoint is somehow hit while miltishipping is disabled.
 * @extends CheckoutShippingServices-ToggleMultiShip
 */
server.prepend('ToggleMultiShip',
    // eslint-disable-next-line
    function (req, res, next) {
        var Site = require('dw/system/Site');
        var site = Site.getCurrent();
        var isMultiShipEnabled = site.getCustomPreferenceValue(
            'isMultiShipActive');

        // If the pref for multishipping is not enabled then this endpoint
        // should not get called, but blocking off to be sure.
        if (empty(isMultiShipEnabled) || !isMultiShipEnabled) {
            response.sendError(403);
        } else {
            return next();
        }
    }
);


server.replace('ToggleMultiShip', server.middleware.https, function (req, res, next) {
    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');
    var collections = require('*/cartridge/scripts/util/collections');
    var Locale = require('dw/util/Locale');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var shippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');
    var currentBasket = BasketMgr.getCurrentBasket();
    var UUIDUtils = require('dw/util/UUIDUtils');

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return;
    }

    var shipments = currentBasket.shipments;
    var defaultShipment = currentBasket.defaultShipment;
    var usingMultiShipping = req.form.usingMultiShip === 'true';

    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);

    if (usingMultiShipping) {
        var plis = currentBasket.getProductLineItems();
        Transaction.wrap(function () {
            for (var i = 0; i < plis.length; i++) {
                var pli = plis[i];
                if (pli.quantityValue > 1) {
                    COHelpers.separateQuantities(plis[i], currentBasket);
                    if (pli.minOrderQuantityValue === 1) {
                        currentBasket.removeProductLineItem(pli);
                    }
                } else if (empty(pli.custom.fromStoreId)) {
                    var uuid = UUIDUtils.createUUID();
                    var newShipment = currentBasket.createShipment(uuid);
                    pli.setShipment(newShipment);
                }
            }
            collections.forEach(currentBasket.shipments, function (shipment) {
                shipment.createShippingAddress();
            });
            COHelpers.ensureNoEmptyShipments(req);
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
    } else {
        // combine multiple shipments into a single one
        Transaction.wrap(function () {
            collections.forEach(shipments, function (shipment) {
                if (!shipment.default) {
                    collections.forEach(shipment.productLineItems, function (shipmentLineItem) {
                        var defaultLineItems = defaultShipment.productLineItems;
                        collections.forEach(defaultLineItems, function (defaultShipmentLineItem) {
                            if (shipmentLineItem.productID === defaultShipmentLineItem.productID) {
                                currentBasket.removeProductLineItem(shipmentLineItem);
                                // eslint-disable-next-line radix
                                var itemQty = parseInt(defaultShipmentLineItem.quantityValue);
                                defaultShipmentLineItem.setQuantityValue(itemQty + 1);
                            } else {
                                shipmentLineItem.setShipment(defaultShipment);
                            }
                        });
                    });
                    currentBasket.removeShipment(shipment);
                }
            });

            shippingHelpers.selectShippingMethod(defaultShipment);
            defaultShipment.createShippingAddress();

            COHelpers.ensureNoEmptyShipments(req);

            if (req.currentCustomer.addressBook && req.currentCustomer.addressBook.preferredAddress) {
                var preferredAddress = req.currentCustomer.addressBook.preferredAddress;
                COHelpers.copyCustomerAddressToShipment(preferredAddress);
            }

            basketCalculationHelpers.calculateTotals(currentBasket);
        });
    }

    var currentLocale = Locale.getLocale(req.locale.id);

    var basketModel = new OrderModel(
        currentBasket,
        { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
    );

    res.json({
        customer: new AccountModel(req.currentCustomer),
        order: basketModel
    });

    next();
});

module.exports = server.exports();
