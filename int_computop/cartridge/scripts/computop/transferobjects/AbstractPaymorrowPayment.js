/* eslint-disable no-multi-spaces */
/* globals session */
// FIXME other globals request, customer - better add their params per function?
'use strict';

/**
 * Paymorrow Abstract transfer object class
 */

/* API includes */
var HashMap     = require('dw/util/HashMap');
var StringUtils = require('dw/util/StringUtils');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');
var iso3166         = require('~/cartridge/scripts/computop/lib/ISO3166');

var AbstractPaymorrowPayment = AbstractPayment.extend({
    /**
     * Get cdpm payment operator for current line item container
     *
     * @returns {dw.order.OrderPaymentInstrument} - current order payment instrument
     */
    getPaymentInstrument: function () {
        if (this.paymentInstrument) {
            return this.paymentInstrument;
        }

        var paymentInstruments = this.getLineItemCtnr().getPaymentInstruments().iterator();

        while (paymentInstruments.hasNext()) {
            var instrument = paymentInstruments.next();
            if (instrument.getPaymentMethod().indexOf('PAYMENTOPERATOR', 0) > -1) {
                this.paymentInstrument = instrument;
            }
        }
        return this.paymentInstrument;
    },

    /**
     * Set PaymentInstrument
     *
     * @param dw.order.OrderPaymentInstrument paymentInstrument - current lineItemCtnr's payment instrument
     * @returns {Object} - this transfer object
     */
    setPaymentInstrument: function (paymentInstrument) {
        this.paymentInstrument = paymentInstrument;
        return this;
    },

     /**
      * Set EventToken
      *
      * @param {string} token - paymorrow event token
      * @returns {Object} - this transfer object
      */
    setEventToken: function (token) {
        this.token = token;
        return this;
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - parameters of current basket
     */
    getCartParams: function () {
        var lineItemCtnr = this.getLineItemCtnr();
        var map = new HashMap();
        map.put('ArticleList', this.createArticleList(lineItemCtnr));

        if (lineItemCtnr.totalTax.available) {
            map.put('TaxAmount', (lineItemCtnr.totalTax.value * 100).toFixed(0));
        }
        map.put('RefNr', lineItemCtnr.custom.paymentOperatorRefNr);
        map.put('OrderDesc', this.getOrderDescription(lineItemCtnr, 50));
        return map;
    },

    /**
     * Retrieve Paymorrow specific params
     *
     * @returns {dw.util.HashMap} - custom parameters incl gender, payID, event token
     */
    getCustomParams: function () {
        var map = new HashMap();
        var paymentInfo = this.getPaymentInformation();

        var gender = paymentInfo.gender_pm === '0' ? 'M' : 'F';
        map.put('Gender', gender);

        var paymentInstrument = this.getPaymentInstrument();
        if (paymentInstrument.custom.paymentOperatorPayID) {
            map.put('PayID', paymentInstrument.custom.paymentOperatorPayID);
            map.put('EventToken', '11');
        } else {
            map.put('EventToken', this.token);
        }

        // FIXME check if these properties need to be migrated
        map.put('DeviceID', session.privacy.paygateDeviceID);
        map.put('BrowserSessionID', request.getHttpCookies()['sid'].value);
        map.put('CookieID', session.sessionID);
        map.put('BrowserHeader', this.createBrowserHeader());
        map.put('Language', 'DE'); // FIXME better from req.Locale?
        return map;
    },

    /**
     * Fetch address billing / shipping address data, dob, email
     *
     * @returns {dw.util.HashMap} - customer address parameters
     */
    getCustomerAddressParams: function () {
        var map = new HashMap();
        var billingAddress = this.getBillingAddress();

        map.put('LastName', billingAddress.getLastName());
        map.put('FirstName', billingAddress.getFirstName());
        map.put('Phone', billingAddress.getPhone());
        map.put('bdStreet', billingAddress.getAddress1());
        map.put('bdZIP', billingAddress.getPostalCode());
        map.put('bdCity', billingAddress.getCity());
        map.put('bdCountryCode', iso3166.getIso3166Code(billingAddress.getCountryCode().value));

        var lineitemCtnr = this.getLineItemCtnr();
        var customerEmail = lineitemCtnr.getCustomerEmail();
        if (!customerEmail && lineitemCtnr.customer && lineitemCtnr.customer.profile) {
            customerEmail = lineitemCtnr.customer.profile.email;
        }

        map.put('e-mail', customerEmail);

        var paymentInfo = this.getPaymentInformation();
        var profile = customer.profile;
        var birthstring;

        // add customer birthday: with priority from profile or from payment form
        if (profile && profile.birthday) {
            birthstring = profile.birthday.getUTCFullYear() +
                StringUtils.formatNumber(profile.birthday.getUTCMonth(), '00') +
                StringUtils.formatNumber(profile.birthday.getUTCDate(), '00');
        } else {
            birthstring = paymentInfo.year_pm +
                StringUtils.formatNumber(paymentInfo.month_pm, '00') +
                StringUtils.formatNumber(paymentInfo.day_pm, '00');
        }
        map.put('DateOfBirth', birthstring);
        map.put('bdStreetNr', billingAddress.custom.houseNumber);

        // shipping address
        var shippingAddress = this.getShippingAddress();
        map.put('sdLastName', shippingAddress.getFirstName() + ' ' + shippingAddress.getLastName());
        map.put('sdStreet', shippingAddress.getAddress1());
        map.put('sdStreetNr', shippingAddress.custom.houseNumber);
        map.put('sdZIP', shippingAddress.getPostalCode());
        map.put('sdCity', shippingAddress.getCity());
        map.put('sdCountryCode', iso3166.getIso3166Code(shippingAddress.getCountryCode().value));

        return map;
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - MAC parameters
     */
    getMACParamsCart: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        var cart = this.getLineItemCtnr();
        map.put('TransID', cart.custom.paymentOperatorRefNr);
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue());
        map.put('Currency', 'EUR'); // FIXME get currency from lineItemCtnr

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
     * Create BrowserHeader
     *
     * @returns {string} - browser headers as string
     */
    createBrowserHeader: function () {
        var browserheaders = '';
        var headers = request.httpHeaders;
        var keys = headers.keySet();
        if (headers) {
            for (var i = 0; i < keys.length; i++) {
                browserheaders = browserheaders + keys[i] + ': ' + headers[keys[i]];
                if (i < keys.length) {
                    browserheaders += '\n';
                }
            }
        }
        return StringUtils.encodeBase64(browserheaders);
    },


    /**
     * Create Article List for request
     *
     * @returns {string} - line items as concatenated string
     */
    createArticleList: function () {
        var articleList = '';
        var lineitemcnt = this.getLineItemCtnr();

        // Quantity;ArticleID;Name;Type;Category;UnitPriceGross;GrossAmount;VatRate;VatAmount

        /* ProductLineItems */
        var plis = lineitemcnt.getAllProductLineItems();
        var gvatrate = 0;

        var i;
        for (i = 0; i < plis.length; i++) {
            var pli = plis[i];
            var pm = pli.product.isVariant() ? pli.product.masterProduct : pli.product;

            var category = pli.product.custom.paymentOperatorPaymorrowCategory.value
                ? pli.product.custom.paymentOperatorPaymorrowCategory.value
                : 'MISC';

            // calculate general vatrate
            gvatrate = StringUtils.formatNumber((pli.getTaxRate() * 10000), '0000');
            // gvatrate = "19%";
            var qty = pli.quantity.value;

            articleList += [
                qty,
                pli.productID,
                pli.productName,
                'GOODS',
                category,
                (pli.getAdjustedGrossPrice().value * 100 / qty).toFixed(0), // eslint-disable-line no-mixed-operators
                (pli.getAdjustedGrossPrice().value * 100).toFixed(0),
                gvatrate,
                (pli.getAdjustedTax().value * 100).toFixed(0)
            ].join(';');

            if ((i + 1) < plis.length) {
                articleList += '+';
            }
        }

        /* Gift Certificates */
        var gplis = lineitemcnt.getGiftCertificateLineItems();
        if (gplis) {
            for (i = 0; i < gplis.length; i++) {
                var gpli = gplis[i];

                if (i == 0) {
                    articleList += '+';
                }
                articleList += [
                    1,
                    'VOUCHER',
                    'VOUCHER',
                    'VOUCHER',
                    'MISC',
                    (gpli.getGrossPrice().value * 100).toFixed(0),
                    (gpli.getGrossPrice().value * 100).toFixed(0),
                    StringUtils.formatNumber((gpli.getTaxRate() * 10000), '0000'),
                    (gpli.getTax().value * 100).toFixed(0)
                ].join(';');

                if ((i + 1) < gplis.length) {
                    articleList += '+';
                }
            }
        }

        /* Gift Certificates PI */
        var PaymentInstrument = require('dw/order/PaymentInstrument');
        var giftcerts = lineitemcnt.getPaymentInstruments(PaymentInstrument.METHOD_GIFT_CERTIFICATE);
        var giftcertsIterator = giftcerts.iterator();

        var giftcertArticleListe = [];
        while (giftcertsIterator.hasNext()) {
            var giftcert = giftcertsIterator.next();
            var giftcertData = [
                1, // qty
                'GIFT_CERTIFICATE', // sku
                giftcert.maskedGiftCertificateCode, // name
                'VOUCHER', // type
                'MISC', // category
                (giftcert.paymentTransaction.amount * 100).toFixed(0), // unit price
                (giftcert.paymentTransaction.amount * 100).toFixed(0), // total amount
                0, // vat rate
                0 // vat amount
            ].join(';');

            giftcertArticleListe.push(giftcertData);
        }
        if (giftcertArticleListe.length > 0) {
            articleList += '+' + giftcertArticleListe.join('+');
        }

        /* coupons */
        var couponArticleList = [];
        var couponIterator = lineitemcnt.couponLineItems.iterator();
        while (couponIterator.hasNext()) {
            var coupon = couponIterator.next();
            var couponData = [];
            var priceAdjustments = coupon.getPriceAdjustments().iterator();

            while (priceAdjustments.hasNext()) {
                var priceAdjustment = priceAdjustments.next();

                couponData = [
                    1, // qty
                    'COUPON', // sku
                    coupon.couponCode, // name
                    'VOUCHER', // type
                    'MISC', // category
                    (priceAdjustment.getGrossPrice().value * 100).toFixed(0), // unit price
                    (priceAdjustment.getGrossPrice().value * 100).toFixed(0), // total amount
                    (priceAdjustment.taxRate * 100).toFixed(0) * 100, // vat rate
                    (priceAdjustment.getTax().value * 100).toFixed(0) // vat amount
                ].join(';');

                couponArticleList.push(couponData);
            }
        }
        if (couponArticleList.length > 0) {
            articleList += '+' + couponArticleList.join('+');
        }

        /* fallback for all other priceadjustments */
        var otherPriceAdjustments = [];
        var priceAdjustmentsIterator = lineitemcnt.priceAdjustments.iterator();
        while (priceAdjustmentsIterator.hasNext()) {
            var otherPriceAdjustment = priceAdjustmentsIterator.next();

            if (otherPriceAdjustment.basedOnCoupon) {
                continue;
            }

            var priceAdjustmentData = [
                1, // qty
                'VOUCHER', // sku
                otherPriceAdjustment.promotionID, // name
                'VOUCHER', // type
                'MISC', // category
                (otherPriceAdjustment.getGrossPrice().value * 100).toFixed(0), // unit price
                (otherPriceAdjustment.getGrossPrice().value * 100).toFixed(0), // total amount
                (otherPriceAdjustment.taxRate * 100).toFixed(0) * 100, // vat rate
                (otherPriceAdjustment.getTax().value * 100).toFixed(0) // vat amount
            ].join(';');

            otherPriceAdjustments.push(priceAdjustmentData);
        }
        if (otherPriceAdjustments.length > 0) {
            articleList += '+' + otherPriceAdjustments.join('+');
        }

        /* shipping cost */
        if (lineitemcnt.shippingTotalPrice.available) {
            articleList += '+';
            articleList += [
                1,
                'shipping',
                'shipping',
                'SHIPPING',
                'MISC',
                (lineitemcnt.shippingTotalPrice.value * 100).toFixed(),
                (lineitemcnt.shippingTotalPrice.value * 100).toFixed(),
                gvatrate,
                (lineitemcnt.getShippingTotalTax().value * 100).toFixed()
            ].join(';');
        }
        return articleList;
    }

});
module.exports = AbstractPaymorrowPayment;
