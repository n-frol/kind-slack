'use strict';
/**
 * Transfer object for payment method PaypalExpress
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');
var PayPalHelpers = require(
    '*/cartridge/scripts/computop/helpers/PayPalHelpers');

var PayPalReferenceTransaction = AbstractPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        // only MAC params required
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getPaypalParams'
        ];
        this.payPalParams = new HashMap();
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var HashBasedMAC = require(
            'int_computop/cartridge/scripts/computop/lib/HashBasedMAC');
        var map = new HashMap();
        map.put('TransID', this.getOrder().getUUID());
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        var paymentInstrument = this.getPaymentInstrument();
        if (!empty(paymentInstrument) && paymentInstrument.getPaymentMethod() === "PayPal") {
        	map.put('Amount', this.getAmountFractionValue(paymentInstrument.getPaymentTransaction().getAmount()));
        }
        else {
        	map.put('Amount', this.getAmountFractionValue());
        }
        map.put('Currency', this.getCurrency());

        // If the site pref is enabled, include the MAC parameter.
        if (includeHMAC) {
            var computedMAC = HashBasedMAC.getHMAC(
                [map.TransID, map.MerchantID, map.Amount, map.Currency],
                this.getSitePreference('paymentOperatorHMACKey')
            );

            map.put('MAC', computedMAC);
        }

        map.put('PayID', '');
        return map;
    },

    /**
     * Set pregenerated order number
     *
     * @param {string} orderNo - pregenerated orderNo
     * @returns {Object} - this transfer object
     */
    setOrderNo: function (orderNo) {
        this.orderNo = orderNo;
        return this;
    },

    /**
     * Order params
     *
     * @returns {dw.util.HashMap} - order parameter hash map
     */
    getOrderParams: function () {
        var map = new HashMap();
        var basket = this.getOrder();
        map.put('ReqID', this.getOrderNo());
        map.put('UserData', this.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(basket, 127, true));
        if (!empty(basket) && basket.getPaymentInstruments("PayPal").getLength() > 0) {
        	map.put('BillingAgreementID', basket.getPaymentInstruments("PayPal").iterator().asList().get(0).getCustom().paymentOperatorPPBillingAgreementId);
        }
        else {
        	map.put('BillingAgreementID', PayPalHelpers.getPayPalCustomerPI());
        }

        // orderdesc2-99
        var productLineItems = basket.getAllProductLineItems().iterator();
        var itemCounter = 2;
        while (productLineItems.hasNext()) {
            var pli = productLineItems.next();

            map.put('OrderDesc' + itemCounter,
                pli.getProductName() + ','
                + this.getAmountFractionValue(pli.getPrice()) + ','
                + pli.getProductID() + ','
                + pli.getQuantity());

            itemCounter++;
            // OrderDesc2-99 allowed
            if (itemCounter > 99) {
                break;
            }
        }

        map.put('RefNr', this.getOrderNo());
        return map;
    },

    /**
     * Get url for payment operator redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference(
                'paymentOperatorPayPalReferencePaymentPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
    * Method that returns paypal specific params
    *
    * @return {dw.util.HashMap} - paypal specific parameters
    */
    getPaypalParams: function () {
        var map = new HashMap();
        var paypalCaptureType = this.getSitePreference(
            'paymentOperatorPaypalCaptureType').value;
        map.put('Capture', paypalCaptureType);

        // Order | Auth paymentOperatorPaypalTxtype
        if (paypalCaptureType === 'manual') {
            map.put('Txtype', this.getSitePreference(
                'paymentOperatorPaypalTxtype'));
        }

        var shippingAddress = this.order.defaultShipment.shippingAddress;
        map.put('FirstName', shippingAddress.firstName);
        map.put('LastName', shippingAddress.lastName);
        map.put('AddrStreet', shippingAddress.address1);
        map.put('AddrStreet2', !empty(shippingAddress.address2) ?
            shippingAddress.address2 : '');
        map.put('AddrCity', shippingAddress.city);
        map.put('AddrState', shippingAddress.stateCode);
        map.put('AddrZip', shippingAddress.postalCode);
        map.put('AddrCountryCode', shippingAddress.countryCode);
        map.put('Phone', shippingAddress.phone);

        return map;
    }
});
module.exports = new PayPalReferenceTransaction();
