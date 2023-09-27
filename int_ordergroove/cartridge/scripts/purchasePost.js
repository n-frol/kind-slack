'use strict';

/**
 * OrderGroove Purchase Post
 * Can be used with, without and at the same time as OrderGroove’s cart tracking system.
 * POST must be made to OrderGroove with every purchase/checkout regardless of whether or not a subscription is to be created.
 * If subscription information is being sent, payment becomes a required object in the payload.
 *
 * @module purchasePost
 *
 * @input OrderNo : String
 * @output Response : dw.svc.Result
 */

/* API Includes */
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Service = require('dw/svc/Service');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var HTTPService = require('dw/svc/HTTPService');
var Site = require('dw/system/Site');
var Mac = require('dw/crypto/Mac');
var Bytes = require('dw/util/Bytes');
var Encoding = require('dw/crypto/Encoding');
var Cookies = require('dw/web/Cookies');
var Cookie = require('dw/web/Cookie');
var HTTPClient = require('dw/net/HTTPClient');
var Profile = require('dw/customer/Profile');
var OrderAddress = require('dw/order/OrderAddress');
var List = require('dw/util/List');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var OrderPaymentInstrument = require('dw/order/OrderPaymentInstrument');
var StringUtils = require('dw/util/StringUtils');
var Cipher = require('dw/crypto/WeakCipher');
var Iterator = require('dw/util/Iterator');
var Logger = require('dw/system/Logger');
var Log = require('dw/system/Log');
var ObjectTypeDefinition = require('dw/object/ObjectTypeDefinition');
var Transaction = require('dw/system/Transaction');
var CustomObject = require('dw/object/CustomObject');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Template = require('dw/util/Template');
var Map = require('dw/util/Map');
var HashMap = require('dw/util/HashMap');
var Mail = require('dw/net/Mail');
var ArrayList = require('dw/util/ArrayList');
var MimeEncodedText = require('dw/value/MimeEncodedText');
var System = require('dw/system/System');
var Status = require('dw/system/Status');
var Result = require('dw/svc/Result');
var SeekableIterator = require('dw/util/SeekableIterator');

/* Reserved function for pipeline compatibility */
function execute(pdict) {
	pdict.Response = purchasePost(pdict.OrderNo);
	return PIPELET_NEXT;
}

/* Main function logic */
function purchasePost(orderNo : String, retry : Boolean, isAutoShip : Boolean) {
	// Create the service
	var service : Service = LocalServiceRegistry.createService("OrderGroove.CreateSubscription", {
		createRequest: function(svc : HTTPService, order, retry, isAutoShip) {
			// HTTPS POST protocol with headers
			svc.setRequestMethod("POST");
			svc.addHeader("Content-Type", "application/json");
			var auth : Object = new Object();
			auth["public_id"] = Site.getCurrent().getCustomPreferenceValue("OrderGrooveMerchantID");
			var epoch : String = (Date.now() / 1000.0).toPrecision(10).toString();
			auth["ts"] = epoch;
			// Order preferences in BM allow a customer number for guest orders
			var customerID : String = order.getCustomerNo();
			auth["sig_field"] = customerID;
		    var encryptor : Mac = new Mac(Mac.HMAC_SHA_256);
		    var hashInput : String = customerID + "|" + epoch;
		    var hashKey : String = Site.getCurrent().getCustomPreferenceValue("OrderGrooveMerchantHashKey");
		    var hashBytes : Bytes = encryptor.digest(hashInput, hashKey);
			var hash : String = Encoding.toBase64(hashBytes);
			auth["sig"] = hash;
			auth = JSON.stringify(auth);
			svc.addHeader("Authorization", auth);

			// Merchant Info
			var purchaseRequest : Object = new Object();
			purchaseRequest["merchant_id"] = Site.getCurrent().getCustomPreferenceValue("OrderGrooveMerchantID");
			// Custom site preference switch for OrderGroove Session ID
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveSession")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveSession") == true) {
				if(retry) {
					var retryOrder : CustomObject = CustomObjectMgr.getCustomObject("PurchasePostRetry", order.getOrderNo());
					if(!empty(retryOrder)) {
						purchaseRequest["session_id"] = encodeURIComponent(retryOrder.getCustom()["sessionID"]);
					}
				}
				else {
					var cookies : Cookies = request.getHttpCookies();
					var sessionID : String = new String();
					for each(var cookie : Cookie in cookies) {
						var cookieName : String = cookie.getName();
						if(cookieName == "og_session_id") {
							sessionID = cookie.getValue();
							break;
						}
					}
					if(!empty(sessionID)) {
						purchaseRequest["session_id"] = encodeURIComponent(sessionID);
					} else {
						purchaseRequest["session_id"] = order.custom.ogsession;
					}
				}
			}
			purchaseRequest["merchant_order_id"] = encodeURIComponent(order.getOrderNo());

			// User Object
			var user = new Object();
			// Order preferences in BM allow a customer number for guest orders
			user["user_id"] = encodeURIComponent(order.getCustomerNo());
			var profile : Profile = order.getCustomer().getProfile();
			// Guest orders will not have a profile
			if(!empty(profile)) {
				user["first_name"] = encodeURIComponent(profile.getFirstName());
				user["last_name"] = encodeURIComponent(profile.getLastName());
				user["email"] = encodeURIComponent(profile.getEmail());
			}
			else {
				user["first_name"] = encodeURIComponent(order.getBillingAddress().getFirstName());
				user["last_name"] = encodeURIComponent(order.getBillingAddress().getLastName());
				user["email"] = encodeURIComponent(order.getCustomerEmail());
			}
			var userData = new Object();
			// Client-specific data fields (if necessary)
			//userData["key"] = "value";
			user["extra_data"] = userData;

			// Shipping Address Object switch via custom site preference
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveShipping")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveShipping") == true) {
				var shipAddress = new Object();
				var shippingAddress : OrderAddress = order.getDefaultShipment().getShippingAddress();
				shipAddress["first_name"] = encodeURIComponent(shippingAddress.getFirstName());
				shipAddress["last_name"] = encodeURIComponent(shippingAddress.getLastName());
				if(!empty(shippingAddress.getCompanyName())) {
					shipAddress["company_name"] = encodeURIComponent(shippingAddress.getCompanyName());
				}
				shipAddress["address"] = encodeURIComponent(shippingAddress.getAddress1());
				if(!empty(shippingAddress.getAddress2())) {
					shipAddress["address2"] = encodeURIComponent(shippingAddress.getAddress2());
				}
				shipAddress["city"] = encodeURIComponent(shippingAddress.getCity());
				shipAddress["state_province_code"] = encodeURIComponent(shippingAddress.getStateCode());
				shipAddress["zip_postal_code"] = encodeURIComponent(shippingAddress.getPostalCode());
				if(isAutoShip) {
                    shipAddress["phone"] = encodeURIComponent(shippingAddress.getPhone());
                }
				//shipAddress["fax"] = "";
				shipAddress["country_code"] = encodeURIComponent(shippingAddress.getCountryCode().getValue().toString().toUpperCase());
				user["shipping_address"] = shipAddress;
			}

			// Billing Address Object switch via custom site preference
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveBilling")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveBilling") == true) {
				var billAddress = new Object();
				var billingAddress : OrderAddress = order.getBillingAddress();
				billAddress["first_name"] = encodeURIComponent(billingAddress.getFirstName());
				billAddress["last_name"] = encodeURIComponent(billingAddress.getLastName());
				if(!empty(billingAddress.getCompanyName())) {
					billAddress["company_name"] = encodeURIComponent(billingAddress.getCompanyName());
				}
				billAddress["address"] = encodeURIComponent(billingAddress.getAddress1());
				if(!empty(billingAddress.getAddress2())) {
					billAddress["address2"] = encodeURIComponent(billingAddress.getAddress2());
				}
				billAddress["city"] = encodeURIComponent(billingAddress.getCity());
				billAddress["state_province_code"] = encodeURIComponent(billingAddress.getStateCode());
				billAddress["zip_postal_code"] = encodeURIComponent(billingAddress.getPostalCode());
				billAddress["phone"] = encodeURIComponent(billingAddress.getPhone());
				//billAddress["fax"] = "";
				billAddress["country_code"] = encodeURIComponent(billingAddress.getCountryCode().getValue().toString().toUpperCase());
				user["billing_address"] = billAddress;
			}
			purchaseRequest["user"] = user;

			// Payment Object
			var payment = new Object();
			var pil : List = order.getPaymentInstruments().iterator().asList();
			var opi : OrderPaymentInstrument = pil.get(0);
			// the UUID could be used to match a payment instrument in the customer's wallet
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveLabel")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveLabel") == true) {
				if ((opi.getPaymentMethod() === "PAYMENTOPERATOR_PAYPAL") || (opi.getPaymentMethod() === 'PAYMENTOPERATOR_PAYPALEXPRESS')) {
					payment["label"] = "PayPal";
				}
				else {
					payment["label"] = encodeURIComponent(opi.getUUID());
				}
			}
			var hashKeyEncoded : String = StringUtils.encodeBase64(hashKey);
			// Custom site preference switch to use a payment token
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveToken")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveToken") == true) {
				//  An actual credit card token (subscription/profile ID) could be used but the customer number is preferred to utilize the customer profile wallet
				payment["token_id"] = encodeURIComponent(order.getCustomerNo()); // || encodeURIComponent(opi.getCreditCardToken());
			}
			// Custom site preference switch to send credit card holder
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardHolder")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardHolder") == true) {
				if ((opi.getPaymentMethod() === "PAYMENTOPERATOR_PAYPAL") || (opi.getPaymentMethod() === 'PAYMENTOPERATOR_PAYPALEXPRESS')) {
					var ccHolder : String = order.getCustomerEmail();
				}
				else if( opi.getPaymentMethod() === "DW_APPLE_PAY") {
					var ccHolder : String = order.getBillingAddress().getFirstName();
				}
				else {
					var ccHolder : String = opi.getCreditCardHolder();
				}
				var padAmount : Number = 32 - (ccHolder.length % 32);
				var padFill : String = StringUtils.pad(new String(), padAmount).replace(/\s/g, "{");
				ccHolder += padFill;
				var ccHolderEncrypted : String = new Cipher().encrypt(ccHolder, hashKeyEncoded, "AES/ECB/NOPADDING", "", 0);
				payment["cc_holder"] = Encoding.toURI(ccHolderEncrypted);

			}
			// Custom site preference switch to send credit card number
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardNumber")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardNumber") == true) {
				if(retry) {
					var retryOrder : CustomObject = CustomObjectMgr.getCustomObject("PurchasePostRetry", order.getOrderNo());
					if(!empty(retryOrder)) {
						payment["cc_number"] = Encoding.toURI(retryOrder.getCustom()["encryptedCardNumber"]);
					}
				}
				else {
					var ccNumber = customer.isAuthenticated() ? opi.getCreditCardNumber() : session.getForms().billing.paymentMethods.creditCard.number.value;
					ccNumber = StringUtils.pad(ccNumber, 32).replace(/\s/g, "{");
					var ccNumberEncrypted : String = new Cipher().encrypt(ccNumber, hashKeyEncoded, "AES/ECB/NOPADDING", "", 0);
					payment["cc_number"] = Encoding.toURI(ccNumberEncrypted);
				}
			}
			// Custom site preference switch to send credit card type
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardType")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardType") == true) {
				if ((opi.getPaymentMethod() !== "PAYMENTOPERATOR_PAYPAL") && (opi.getPaymentMethod() !== 'PAYMENTOPERATOR_PAYPALEXPRESS')) {
					var ccType : String = new String();
					switch(opi.getCreditCardType().toUpperCase()) {
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
					payment["cc_type"] = ccType; // no encoding since this is not a string type
				}
			}
			// Custom site preference switch to send credit card expiration
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardExpiration")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardExpiration") == true) {
				if ((opi.getPaymentMethod() === "PAYMENTOPERATOR_PAYPAL") || (opi.getPaymentMethod() === 'PAYMENTOPERATOR_PAYPALEXPRESS')) {
					var ccExp : String = "12/2099";
				}
				else if( opi.getPaymentMethod() === "DW_APPLE_PAY") {
					var ccExp : String = StringUtils.formatNumber(opi.getCreditCardExpirationMonth(), "00") + "/" + opi.getCreditCardExpirationYear();
				}
				else {
					var ccExp : String = StringUtils.formatNumber(opi.getCreditCardExpirationMonth(), "00") + "/" + opi.getCreditCardExpirationYear();
				}
				ccExp = StringUtils.pad(ccExp, 32).replace(/\s/g, "{");
				var ccExpEncrypted : String = new Cipher().encrypt(ccExp, hashKeyEncoded, "AES/ECB/NOPADDING", "", 0);
				payment["cc_exp_date"] = Encoding.toURI(ccExpEncrypted);
			}
			purchaseRequest["payment"] = payment;

			// Products Object
			var products = new Array();
			var product = new Object();
			var components = new Array();
			var count : Number = new Number(0);
			var plis : Iterator = order.getAllProductLineItems().iterator();
			while(plis.hasNext()) {
				// Product Object
				var product : Object = new Object();
				var pli : ProductLineItem = plis.next();
				// Skipping product options (client-specific)
				if(pli.isOptionProductLineItem()) {
					continue;
				}


				// Skipping budled line items
				if(pli.isBundledProductLineItem()) {
					continue;
				}

				// if this is a BYOB master, initialize it's entry
				// in the component hash
				if (pli.custom.isByobMaster) {
					product["boxID"] = pli.custom.boxID;
					if (empty(components[pli.getProductID()])) {
						components[pli.custom.boxID] = new Array();
					}
				}

				// if this is a box component, add SKU to the box's components
				if (!pli.custom.isByobMaster && !empty(pli.custom.boxID)) {
					if (typeof components[pli.custom.boxID] !== 'undefined') {
						for (var i = 0; i < pli.getQuantityValue(); i++) {
							components[pli.custom.boxID].push(pli.getProductID());
						}
					}

					// do not include box components in line items.
					continue;
				}

				product["product"] = encodeURIComponent(pli.getProductID());
				product["sku"] = encodeURIComponent(pli.getProductID());

				// Subscription Info Object
				var subscription = new Object();
				// Custom site preference switch to send subscription data
				if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveSubscription")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveSubscription") == true) {
					subscription["components"] = "";
					subscription["price"] = encodeURIComponent(Number(pli.getProratedPrice().getValue()/pli.getQuantityValue()).toFixed(2));
					subscription["quantity"] = pli.getQuantityValue(); // no encoding since this is not a string type
					var subscribeData = new Object();
					// Client-specific data fields (if necessary)
					//subscribeData["key"] = "store";
					subscription["extra_data"] = subscribeData;
				}

				// Tracking Override Object
				var trackingData = new Object();
				// Custom site preference switch to send tracking override
				if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveTracking")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveTracking") == true) {
					trackingData["offer"] = !empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveOfferID")) ? encodeURIComponent(Site.getCurrent().getCustomPreferenceValue("OrderGrooveOfferID")) : "";
					trackingData["every"] = "";
					trackingData["every_period"] = "";
				}
				subscription["tracking_override"] = trackingData;
				product["subscription_info"] = subscription;

				// Purchase Info Object
				var purchaseData = new Object();
				var unitPrice : Number = Number(pli.getProratedPrice().getValue()/pli.getQuantityValue());
				purchaseData["quantity"] = pli.getQuantityValue(); // no encoding since this is not a string type
				var discountPrice : Number = new Number(0);
				var pap : Iterator = pli.getProratedPriceAdjustmentPrices().values().iterator();
				while(pap.hasNext()) {
					var adjustment : Money = pap.next();
					discountPrice += adjustment.getValue();
				}
				discountPrice = Math.abs(discountPrice)/pli.getQuantityValue();
				var beforeDiscountPrice : Number = unitPrice + discountPrice;
				purchaseData["price"] = encodeURIComponent(beforeDiscountPrice.toFixed(2));
				purchaseData["discounted_price"] = encodeURIComponent(unitPrice.toFixed(2));
				purchaseData["total"] = encodeURIComponent(pli.getProratedPrice().getValue().toFixed(2));
				product["purchase_info"] = purchaseData;

				// Store and handle next product line item
				products[count] = product;
				count++;
			}

			// add components to BYOB master line items
			for (var i = 0; i < products.length; i++) {
				var product = products[i];

				if (!empty(product.boxID) && !empty(components[product.boxID])) {
					product.subscription_info.components = components[product.boxID];
				}
				delete product.boxID;
			}

			purchaseRequest["products"] = products;

			// Convert payload from OOP to JSON
			var payload : String = "create_request=" + JSON.stringify(purchaseRequest, null, 5);
			return payload;
	    },
	    // Mock function expects an object with particular properties but it is not documented in the API
		mockCall: function(svc : HTTPService, request){
			var response : Object = new Object();
			response["statusCode"] = 201;
			response["statusMessage"] = "Success";
			return response;
		},
	    // Parse function only called for a status code in the 200s
	    parseResponse : function(svc : HTTPService, response) {
	    	return response;
	    }
	});

	try {
		// Main Entry Point
		var log : Log = Logger.getLogger("order-groove", "OG");
		if(empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) || Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == false) {
			return; // fast track to finally statement
		}
		var order : Order = OrderMgr.getOrder(orderNo);
		retry = !empty(retry) ? retry : false; // set to false when function parameter is not passed
		// Invoke the service call
		var response : Result = service.call(order, retry, isAutoShip);
		// Make sure custom object exists or it will throw exception
		var retryTypeDef : ObjectTypeDefinition = CustomObjectMgr.describe("PurchasePostRetry");
	}
	catch(e) {
		log.error(e.toString());
	}
	finally {
		if(!empty(response) && response.isOk() == false) {
			// Retry Logic
			if(!empty(retryTypeDef)) {
				// Check if this order number exists in queue
				var retryOrder : CustomObject = CustomObjectMgr.getCustomObject("PurchasePostRetry", order.getOrderNo());
				if(empty(retryOrder)) {
					// Place order in queue for retry since it failed initially
					Transaction.wrap(function(){
						retryOrder = CustomObjectMgr.createCustomObject("PurchasePostRetry", order.getOrderNo());
						// Check if card number should be sent
						if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardNumber")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardNumber") == true
							&& !empty(retryTypeDef.getCustomAttributeDefinition("encryptedCardNumber"))) {
							// Getting decrypted credit card number will not be possible during job run (and depending on retention settings in BM) so we store it for later
							var pil : List = order.getPaymentInstruments("PAYMENTOPERATOR_CREDIT_DIRECT").iterator().asList();
							var opi : OrderPaymentInstrument = pil.get(0);
							var ccNumber = customer.isAuthenticated() ? opi.getCreditCardNumber() : session.getForms().billing.paymentMethods.creditCard.number.value;
							ccNumber = StringUtils.pad(ccNumber, 32).replace(/\s/g, "{");
							var hashKey : String = Site.getCurrent().getCustomPreferenceValue("OrderGrooveMerchantHashKey");
							var hashKeyEncoded : String = StringUtils.encodeBase64(hashKey);
							var ccNumberEncrypted : String = new Cipher().encrypt(ccNumber, hashKeyEncoded, "AES/ECB/NOPADDING", "", 0);
							// Only when initially creating object should number be set here.  Updating card number during retry would not be possible
							retryOrder.getCustom()["encryptedCardNumber"] = ccNumberEncrypted; // this will be encoded during the retry process
						}
						// Check if Session ID should be sent so we can store it for retry later
						if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveSession")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveSession") == true
							&& !empty(retryTypeDef.getCustomAttributeDefinition("sessionID"))) {
							var cookies : Cookies = request.getHttpCookies();
							var sessionID : String = new String();
							for each(var cookie : Cookie in cookies) {
								var cookieName : String = cookie.getName();
								if(cookieName == "og_session_id") {
									sessionID = cookie.getValue();
									break;
								}
							}
							if(!empty(sessionID)) {
								retryOrder.getCustom()["sessionID"] = sessionID; // this will be encoded during the retry process
							}
						}
					});
				}
			}
			// Custom site preference switch to send email notifications
			var code : Number = response.getError();
			if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEmail")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveEmail") == true) {
				// Do not send mail for retry attempts
				if(!retry) {
					// Send mail only on specific HTTPS codes per OrderGroove specification
					if(code == 207 || code == 400 || code == 401) {
						// Send Mail
						var template : Template = new Template("mail/purchasePostError");
						var map : Map = new HashMap();
						map.put("orderNo", order.getOrderNo());
						map.put("status", response.getStatus());
						map.put("msg", response.getMsg());
						// Pretty print JSON for email
						var oMessage : Object = JSON.parse(response.getErrorMessage());
						var errorMessage : String = JSON.stringify(oMessage, null, 5);
						errorMessage = errorMessage.replace(" ", "&nbsp;", "g");
						errorMessage = errorMessage.replace("\n", "<br/>", "g");
						map.put("errorMessage", errorMessage);
						var content : MimeEncodedText = template.render(map);
						var mail : Mail = new Mail();
						mail.setFrom("no-reply@ordergroove.com");
						var addresses : String = new String();
						var addressList : ArrayList = new ArrayList(Site.getCurrent().getCustomPreferenceValue("OrderGrooveAddresses"));
						if(addressList.isEmpty() == false) {
							addresses = addressList.join();
						}
						mail.addTo(addresses);
						if(System.getInstanceType() == System.PRODUCTION_SYSTEM) {
							mail.setSubject("OrderGroove Production Notification");
						}
						else {
							mail.setSubject("OrderGroove Test Notification");
						}
						mail.setContent(content);
						// Mail may not have been sent when this method returns
						var mailStatus : Status = mail.send();
					}
				}
			}
		}
		return response;
	}
}

/* Job process function */
function processRetries() {
	try {
		var log : Log = Logger.getLogger("order-groove", "OG");
		// Make sure custom object exists or it will throw exception
		var retryTypeDef : ObjectTypeDefinition = CustomObjectMgr.describe("PurchasePostRetry");
	}
	catch(e) {
		log.error(e.toString());
		return new Status(Status.ERROR, "MISSING_CUSTOM_OBJECT", "The custom object 'PurchasePostRetry' was not found.");
	}
	finally {
		if(!empty(retryTypeDef)) {
			var retryIter : SeekableIterator = CustomObjectMgr.getAllCustomObjects("PurchasePostRetry");
			if(retryIter.getCount() == 0) {
				retryIter.close();
				return new Status(Status.OK, "ORDERS_NOT_FOUND", "There are no orders for retry.");
			}
			if(empty(retryTypeDef.getCustomAttributeDefinition("orderNo"))) {
				retryIter.close();
				return new Status(Status.ERROR, "MISSING_CUSTOM_OBJECT_ATTRIBUTE", "The custom object 'PurchasePostRetry' with the attribute 'orderNo' was not found.");
			}
			while (retryIter.hasNext()) {
				var retry : CustomObject = retryIter.next();
				var orderNo : String = retry.getCustom()["orderNo"];
				var response : Result = purchasePost(orderNo, true);
				// Remove object from the retry queue when successful, otherwise let internal retention setting handle it
				if(!empty(response) && response.isOk()) {
					// Transaction wrap just in case the script module is not marked as a transaction in job schedule step configurator
					Transaction.wrap(function(){
						CustomObjectMgr.remove(retry);
					});
				}
			}
			retryIter.close();
			return new Status(Status.OK);
		}
	}
}

/* Module exports for controllers and jobs */
module.exports = {
	orderNo : purchasePost,
	retryPurchasePost : processRetries
}
