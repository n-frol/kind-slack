/* eslint-disable no-multi-spaces */
'use strict';
/**
 * Transfer object for payment method easyCredit redirect step (1)
 */

/* API includes */
var HashMap        = require('dw/util/HashMap');
var JSONConversion = require('*/cartridge/scripts/computop/lib/JSONConversion');
var StringUtils    = require('dw/util/StringUtils');
var cdpmLogger     = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var EasyCreditInitialization = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getLineItemCtnrParams',
            'getMACParams',
            'getRedirectUrls',
            'getAddressParams',
            'getCustomerPersonalParams',
            'getCustomParams'
        ];
    },

    /**
     * Get url for payment operator redirect
     *
     * @returns {string}
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorEasyCreditRedirectGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Custom redirect URLs for easyCredit
     *
     *  @returns {dw.util.HashMap} - shop urls for re-entry from paygate
     */
    getRedirectUrls: function () {
        var URLUtils = require('dw/web/URLUtils');
        var map = new HashMap();
        map.put('URLSuccess', URLUtils.https('PaymentOperator-SuccessEasyCredit').toString());
        map.put('URLFailure', URLUtils.https('PaymentOperator-FailureEasyCredit').toString());
        map.put('URLNotify', URLUtils.https('PaymentOperator-Notify').toString());
        map.put('Response', 'encrypt');
        return map;
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - MAC parameter hash map
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        var cart = this.getOrder();
        var cartAmount;
        if (cart.getTotalGrossPrice().isAvailable()) {
            cartAmount = cart.getTotalGrossPrice();
        } else {
            cartAmount = cart.getAdjustedMerchandizeTotalPrice(true).add(cart.getGiftCertificateTotalPrice());
        }
        map.put('TransID', this.transId);
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue(cartAmount));
        map.put('Currency', this.getCurrency());

        // If the site pref is enabled, include the MAC parameter.
        if (includeHMAC) {
            map.put(
                'MAC',
                require('int_computop/cartridge/scripts/computop/lib/HashBasedMAC').getHMAC(
                    [map.TransID, map.MerchantID, map.Amount, map.Currency],
                    this.getSitePreference('paymentOperatorHMACKey')
                )
            );
        }

        return map;
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - article list data
     */
    getLineItemCtnrParams: function () {
        var map = new HashMap();
        map.put('UserData', this.orderNo);
        map.put('ArticleList', this.getArticleListJSON(this.getOrder()));
        map.put('RefNr', this.orderNo);

        // Test mode
        var isTestMode = this.getSitePreference('paymentOperatorTestFlag');
        var testString = this.getSitePreference('paymentOperatorTestString');
        if (isTestMode != null && isTestMode === true) {
            if (testString != null) {
                map.put('OrderDesc', testString);
            } else {
                map.put('OrderDesc', 'Test:0000');
            }
        }

        return map;
    },

    /**
     * Retrieve billing address parameter map
     *
     * @returns {dw.util.HashMap} - address parameter hash map
     */
    getAddressParams: function () {
        var map = new HashMap();
        var lineItemCtnr = this.getOrder();
        var address = lineItemCtnr.billingAddress;

        // FIXME proper object / property validation would be nice
        if (typeof address !== 'object' || !address.getAddress1() || !address.getPostalCode()
            || !address.getCity() || !address.getCountryCode()
        ) {
            return map;
        }
        var streetArray = address.getAddress1().split(' ');
        if (streetArray.length > 1) {
            map.put('bdStreetNr', streetArray.pop());
            map.put('bdStreet', streetArray.join(' '));
        } else {
            return map;
        }
        map.put('bdAddressAddition', !address.getAddress2() ? '' : address.getAddress2());
        map.put('bdZip', address.getPostalCode());
        map.put('bdCity', address.getCity());
        map.put('bdCountryCode', String(address.getCountryCode()).toUpperCase());
        return map;
    },

    /**
     * Retrieve customer personal params (if complete)
     *
     * @returns {dw.util.HashMap} - customer parameter hash map
     */
    getCustomerPersonalParams: function () {
        var map = new HashMap();
        var emptyMap = new HashMap();
        var customer = this.getOrder().getCustomer();

        if (!customer || !customer.profile) {
            return emptyMap;
        }

        if (customer.profile.female) {
            map.put('Salutation', 'FRAU');
        } else if (customer.profile.male) {
            map.put('Salutation', 'HERR');
        } else {
            return emptyMap;
        }

        if (!customer.profile.firstName) {
            return emptyMap;
        }
        map.put('FirstName', customer.profile.firstName);

        if (!customer.profile.lastName) {
            return emptyMap;
        }
        map.put('LastName', customer.profile.lastName);

        var dob = customer.profile.birthday;
        if (!dob) {
            return emptyMap;
        }
        map.put('DateOfBirth', dob.toISOString().substr(0, 10));

        return map;
    },

    /**
     * Retrieve custom easyCredit params
     *
     * @returns {dw.util.HashMap}
     */
    getCustomParams: function () {
        var map = new HashMap();
        var customer = this.getOrder().getCustomer();

        map.put('EventToken', 'INT');

        if (customer && customer.profile) {
            map.put('CustomerLoggedIn', 'YES');
            map.put('Email', customer.profile.email);

            if (customer.profile.phoneMobile) {
                map.put('MobileNr', customer.profile.phoneMobile);
            }
        } else {
            map.put('CustomerLoggedIn', 'NO');
            map.put('Email', this.getOrder().getCustomerEmail());
        }

        return map;
    },

    /**
     * Retrieves and returns a string representing an article list of the current cart in JSON format.
     *
     * @param {dw.order.LineItemCtnr} container - current basket
     * @returns {string} - containing JSON
     */
    getArticleListJSON: function (container) {
        var map = new HashMap();
        var productLineItems = container.getAllProductLineItems().iterator();
        var pliIndex = 1;

        while (productLineItems.hasNext()) {
            var pli = productLineItems.next();
            if (!pli.product) {
                continue;
            }
            map.put('warenkorbinfos.' + (pliIndex.toFixed() - 1) + '.produktbezeichnung', pli.product.name);
            map.put('warenkorbinfos.' + (pliIndex.toFixed() - 1) + '.menge', pli.quantityValue);
            map.put('warenkorbinfos.' + (pliIndex.toFixed() - 1) + '.preis', pli.grossPrice.value);
            if (pli.manufacturerName) {
                map.put('warenkorbinfos.' + (pliIndex.toFixed() - 1) + '.hersteller', pli.manufacturerName);
            }
            map.put('warenkorbinfos.' + (pliIndex.toFixed() - 1) + '.produktkategorie', this.getProductCategory(pli.product));

            map.put('warenkorbinfos.' + (pliIndex.toFixed() - 1) + '.artikelnummern.nummerntyp', 'sfcc-pid');
            map.put('warenkorbinfos.' + (pliIndex.toFixed() - 1) + '.artikelnummern.nummer', pli.product.ID);

            pliIndex++;
        }

        var jsonString = JSONConversion.toParamJson(map);
        cdpmLogger.debug('ArticleList as JSON: ' + jsonString);
        return StringUtils.encodeBase64(jsonString);
    },

    /**
     * retrieve the primary category of the given product
     *
     * @param {dw.catalog.Product} product - get primary category for product
     * @returns {string} - category display name
     */
    getProductCategory: function (product) {
        var productObject = product.isVariant() ? product.masterProduct : product;

        if (productObject === 'null') {
            return '';
        }

        return productObject.primaryCategory.displayName;
    },


    /**
     * Set TransID
     *
     * @param {string} transId - set transaction id
     */
    setTransId: function (transId) {
        this.transId = transId;
    },

    /**
     * Set pregenerated order number
     *
     * @param {string} orderNo - set orderNo for initialisation
     */
    setOrderNo: function (orderNo) {
        this.orderNo = orderNo;
    }

});
module.exports = new EasyCreditInitialization();
