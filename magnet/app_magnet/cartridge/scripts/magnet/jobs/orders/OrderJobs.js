
var Decimal = require("dw/util/Decimal");
var OrderMgr = require("dw/order/OrderMgr");
var CSVStreamWriter = require("dw/io/CSVStreamWriter");
var FileWriter = require("dw/io/FileWriter");
var File = require("dw/io/File");
var Calendar = require("dw/util/Calendar");
var StringUtils = require("dw/util/StringUtils");
var CustomObjectMgr = require("dw/object/CustomObjectMgr");
var Site = require("dw/system/Site");

//basic_date_time_no_millis
var BASIC_DATE_TIME = "yyyyMMdd'T'HHmmssZ";


function AllOrdersJob() {
	var ordersJobSettings = CustomObjectMgr.getCustomObject("MagnetSetting", "orders-job");
	
	var lastDate = new Date("01/01/1970");
	if (!empty(ordersJobSettings)) {
		lastDate = ordersJobSettings.custom.dateValue;
	} else {
		ordersJobSettings = CustomObjectMgr.createCustomObject("MagnetSetting", "orders-job");
		ordersJobSettings.custom.value = "{}";
		ordersJobSettings.custom.dateValue = lastDate;
	}
	
	var jobConfig = JSON.parse(ordersJobSettings.custom.value);
	var additionalLineItemAttributes = jobConfig["additionalLineItemAttributes"];
	var additionalShipmentAttrs = jobConfig["additionalShipmentAttributes"];
	var additionalOrderAttrs = jobConfig["additionalOrderAttributes"];
	
	var siteId = Site.getCurrent().ID;
	var now = new Calendar();
	var cal = new Calendar(lastDate);
	
	var filename = "orders-" + siteId + "-" + StringUtils.formatCalendar(now, BASIC_DATE_TIME) + ".json";
	
	var magnetDirectory : File = new File(File.IMPEX  + File.SEPARATOR + "magnet");

	var exportFile = new File(magnetDirectory, filename);
	var fileWriter = null;
	
	var orderResult = OrderMgr.searchOrders("creationDate > {0}", "creationDate asc", lastDate.toISOString());
	var orders = [];
	var orderCount = 0;
	
	while (orderResult.hasNext() && orderCount < 1000) {
		if (empty(fileWriter)) {
			fileWriter = new FileWriter(exportFile, "UTF-8");
		}

		var order = orderResult.next();
		var orderDateCal = new Calendar(order.creationDate);
		var rollups = {};
		var shipments = [];
		
		if (empty(order.shipments) || order.shipments.length == 0) {
			continue;
		}
		
		
		for (var i=0; i<order.shipments.length; i++) {
			var shipment = order.shipments[i];
			var lineItems = [];
			
			for (var j=0; j<shipment.productLineItems.length; j++) {
				var lineItem = shipment.productLineItems[j];
				
				var lineItemObj = {
					"name" : lineItem.productName,
					"lineItemText" : lineItem.lineItemText,
					"categoryID" : lineItem.categoryID,
					"productID" : lineItem.productID,
					"quantity" : lineItem.quantity.value,
					"price" : lineItem.priceValue,
				};

				if (!empty(lineItem.product) && lineItem.product.variant) {
					var master = lineItem.product.variationModel.master;
					lineItemObj.masterProductName = master.name;
					lineItemObj.masterProductID = master.ID;
				}

				if (!empty(additionalLineItemAttributes)) {
					for(var y=0; y<additionalLineItemAttributes.length; y++) {
						var additionalAttr = additionalLineItemAttributes[y];
						var obj = lineItem;

						for(var z=0; z<additionalAttr.path.length; z++) {
							obj = obj[additionalAttr.path[z]];
						}
						lineItemObj[additionalAttr.name] = obj;

						if (additionalAttr.rollup) {
							if (empty(rollups[additionalAttr.name])) {
								rollups[additionalAttr.name] = [];
							}
							rollups[additionalAttr.name].push(obj);
						}

					}
				}

				lineItems.push(lineItemObj);
			}

			var shipmentObj = {
				"shippingMethodID" : shipment.shippingMethodID,
				
				"adjustedMerchandizeTotalPrice" : shipment.adjustedMerchandizeTotalPrice.value,
				"adjustedShippingTotalPrice" : shipment.adjustedShippingTotalPrice.value,
				"totalTax" : shipment.totalTax.value,
				"totalGrossPrice" : shipment.totalGrossPrice.value,
				
				"lineItems" : lineItems
			};
			
			if (!empty(additionalShipmentAttrs)) {
				for(var y=0; y<additionalShipmentAttrs.length; y++) {
					var additionalAttr = additionalShipmentAttrs[y];
					var obj = shipment;
					
					for(var z=0; z<additionalAttr.path.length; z++) {
						obj = obj[additionalAttr.path[z]];
					}
					shipmentObj[additionalAttr.name] = obj;
					
					if (additionalAttr.rollup) {
						if (empty(rollups[additionalAttr.name])) {
							rollups[additionalAttr.name] = [];
						}
						rollups[additionalAttr.name].push(obj);
					}
					
				}
			}
			
			shipments.push(shipmentObj);
		}
		
		var lineProductIDs = [];
		for (var x=0; x<order.productLineItems.length; x++) {
			var pli = order.productLineItems[x];
			lineProductIDs.push(pli.productID);
		}
		
		var orderData = {
			"orderNo" : order.orderNo,
			"customerNo" : order.customerNo,
			"status" : order.status.displayValue,
			"creationDate" : StringUtils.formatCalendar(orderDateCal, BASIC_DATE_TIME),
			"remoteHost" : order.remoteHost,
			
			"adjustedMerchandizeTotalPrice" : order.adjustedMerchandizeTotalPrice.value,
			"adjustedShippingTotalPrice" : order.adjustedShippingTotalPrice.value,
			"giftCertificateTotalPrice" : order.giftCertificateTotalPrice.value,
			"totalTax" : order.totalTax.value,
			"totalGrossPrice" : order.totalGrossPrice.value,
			
			"billingCity" : order.billingAddress ? order.billingAddress.city : null,
			"billingStateCode" : order.billingAddress ? order.billingAddress.stateCode : null,
			"billingPostalCode" : order.billingAddress ? order.billingAddress.postalCode : null,
			
			"numShipments" : shipments.length,
			"shipments" : shipments,
			
			"lineProductIDs" : lineProductIDs,
			
			"isRegisteredCustomer" : order.customer.registered
		};
		
		for (var key in rollups) {
			if (rollups.hasOwnProperty(key)) {
				orderData[key] = rollups[key];
			}
		}
		
		if (!empty(additionalOrderAttrs)) {
			for(var y=0; y<additionalOrderAttrs.length; y++) {
				var additionalAttr = additionalOrderAttrs[y];
				var obj = order;
				
				for(var z=0; z<additionalAttr.path.length; z++) {
					obj = obj[additionalAttr.path[z]];
				}
				orderData[additionalAttr.name] = obj;
			}
		}

		fileWriter.writeLine(JSON.stringify(orderData));

		orderCount++;
		lastDate = order.getCreationDate();
	}
		
	ordersJobSettings.custom.dateValue = lastDate;
	
	var count = orderResult.count;
	if (!empty(fileWriter)) {
		fileWriter.close();
	}

}

exports.AllOrdersJob = AllOrdersJob;
