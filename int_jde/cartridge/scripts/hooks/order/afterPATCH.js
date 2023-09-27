/* global empty */
'use strict';

/**
 * afterPATCH.js
 *
 * Runs after an OCAPI PATCH request has been made.
 */

// SFCC system class imports.
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
var URLUtils = require('dw/web/URLUtils');
var Money = require('dw/value/Money');

// Module level declarations.
var ShippingUtil = require('lib_utils/cartridge/scripts/ShippingUtil');
var log = Logger.getLogger('JDE', 'JDE');

/**
 * Updates Export Status if isExportedJDE is true
 * @param {dw.order} order: Order Object
 * @param {boolean} isExportedJDE: Flags order should be exported
 */
function updateExportStatus(order, isExportedJDE) {
    /**
     * Checks if JDE Export Status is set to true. If it is, update the export status to exported.
     */
    if (!empty(order) && !empty(isExportedJDE) && isExportedJDE) {
        try {
            Transaction.begin();
            order.exportStatus = order.EXPORT_STATUS_EXPORTED;
            Transaction.commit();
            log.info('Successfully updated order {0} to exported.', order.orderNo);
        } catch (e) {
            Transaction.rollback();
            log.warn('Failed to update order {0} to exported.', order.orderNo);
        }
    }
}

/**
 * Updates Payment Status based on the value of omsPaymentIndicator
 * @param {dw.order} order: Order Object
 * @param {string} omsPaymentIndicator: OMS Payment Indicator
 */
function updatePaymentStatus(order, omsPaymentIndicator) {
    /**
     * Sets value of payment status based on payment indicator
     */
    if (!empty(order) && !empty(omsPaymentIndicator) && omsPaymentIndicator) {
        var paymentStatus;
        if (omsPaymentIndicator === order.PAYMENT_STATUS_NOTPAID) {
            paymentStatus = order.PAYMENT_STATUS_NOTPAID;
        } else if (omsPaymentIndicator === order.PAYMENT_STATUS_PARTPAID) {
            paymentStatus = order.PAYMENT_STATUS_PARTPAID;
        } else if (omsPaymentIndicator === order.PAYMENT_STATUS_PAID) {
            paymentStatus = order.PAYMENT_STATUS_PAID;
        }
        if (!empty(paymentStatus)) {
            try {
                Transaction.begin();
                order.paymentStatus = paymentStatus;
                Transaction.commit();
                log.info('Successfully updated order {0} payment status.', order.orderNo);
            } catch (e) {
                Transaction.rollback();
                log.error('Failed to update order {0} payment status.', order.orderNo);
            }
        }
    }
}


/**
 * Returns quantity of order less BYOB box contents
 * @param {dw.order} order: Order Object
 * @return {number} order quantity
 */
function getBYOBOrderQuantity(order) {
    var pliIterator = order.getProductLineItems().iterator();

    var byobQuantity = 0;
    while (pliIterator.hasNext()) {
        var pli = pliIterator.next();

        if (!empty(pli.product) && (pli.product.custom.isByobMaster || empty(pli.custom.boxID)) && pli.productID !== 'changeup-donation') {
            byobQuantity += pli.quantityValue;
        }
    }

    return byobQuantity;
}


/**
 * Updates Shipment Status based on number of items shipped
 * @param {dw.order} order: Order Object
 */
function updateShipmentStatus(order) {
    var confirmedShipments = JSON.parse(order.custom.confirmedShipments);
    if (!empty(order) && !empty(confirmedShipments)) {
        var shippedCount = 0;
        var shippingStatus;
        for (var i = 0; i < confirmedShipments.length; i++) {
            shippedCount += confirmedShipments[i].QtyShipped;
        }

        if (shippedCount >= getBYOBOrderQuantity(order)) {
            shippingStatus = order.SHIPPING_STATUS_SHIPPED;
        } else if (shippedCount > 0) {
            shippingStatus = order.SHIPPING_STATUS_PARTSHIPPED;
        } else {
            shippingStatus = order.SHIPPING_STATUS_NOTSHIPPED;
        }

        if (!empty(shippingStatus)) {
            try {
                Transaction.begin();
                order.shippingStatus = shippingStatus;
                Transaction.commit();
                log.info('Successfully updated order {0} shipping status.', order.orderNo);
            } catch (e) {
                Transaction.rollback();
                log.warn('Failed to update order {0} shipping status.', order.orderNo);
            }
        }
    }
}

/**
 * Get Product Line Object
 * @param {string} productID: Passes product ID
 * @param {Object} confirmedShipment: Confirmed Shipment
 * @return {Object} product line item information
 */
function getProductLineItemObject(productID, confirmedShipment) {
    if (!empty(productID)) {
        var Product = ProductMgr.getProduct(productID);

        if (!empty(Product)) {
            var productImageLg = Product.getImage('large');
            var productImage;

            if (!empty(productImageLg)) {
                productImage = productImageLg.getAbsURL().toString();
            } else {
                productImage = URLUtils.staticURL('/images/noimagemedium.png');
            }

            if (!empty(confirmedShipment.QtyShipped)) {
                return {
                    productID: productID,
                    productName: Product.name,
                    productImageURL: productImage,
                    productQuantityShipped: confirmedShipment.QtyShipped
                };
            }
        }
    }
    return false;
}

/**
 * Creates Shipment Custom Objects
 * @param {dw.order.Order} order: Order Object
 * @return {boolean} function flag
 */
function createShipmentCustomObjects(order) {
    var confirmedShipments = JSON.parse(order.custom.confirmedShipments);
    var orderLineItems = order.allProductLineItems;
    var errMsg = '';

    if (!empty(confirmedShipments) && !empty(orderLineItems)) {
        // Get an array of the Product IDs in the order to ensure that only items
        // listed in the order are included.
        var orderLineItemIds = orderLineItems.toArray().map(function (oli) {
            return oli.productID;
        });

        var shipmentProductLineItems = {};
        for (var i = 0; i < confirmedShipments.length; i++) {
            // Add porduct line items to the appropriate shipment
            var ShipmentObject;
            var shipmentNumber = confirmedShipments[i].ShipmentNumber.toString();
            var orderNumber = order.orderNo;
            var trackingNumber = confirmedShipments[i].TrackingNumber;
            var productID = confirmedShipments[i].ItemSku;

            if (!empty(productID) && orderLineItemIds.indexOf(productID) > -1) {
                var productLineItem = getProductLineItemObject(productID, confirmedShipments[i]);

                if (!empty(productLineItem) && productLineItem) {
                    // Create shipment array if it's not yet created
                    if (empty(shipmentProductLineItems[shipmentNumber])) {
                        shipmentProductLineItems[shipmentNumber] = [];
                    }

                    // Add the product line item to the shipment array.
                    shipmentProductLineItems[shipmentNumber].push(productLineItem);

                    // Get or the custom OrderTransactionalEmails instance.
                    ShipmentObject = CustomObjectMgr.getCustomObject('OrderTransactionalEmails', shipmentNumber);

                    try {
                        // ================  Begin Transaction  ===================== */
                        Transaction.begin();

                        // Get the OrderTransactionalEmails custom object instance.
                        if (empty(ShipmentObject)) {
                            ShipmentObject = CustomObjectMgr.createCustomObject('OrderTransactionalEmails', shipmentNumber);
                        }

                        // Set the Order status
                        if (order.shippingStatus.value === order.SHIPPING_STATUS_PARTSHIPPED) {
                            ShipmentObject.custom.emailType = 'partiallyShippedConfirmation';
                        } else {
                            ShipmentObject.custom.emailType = 'shippingConfirmation';
                        }

                        // Order #
                        if (empty(ShipmentObject.custom.orderNumber)) {
                            ShipmentObject.custom.orderNumber = orderNumber;
                        }

                        // Customer Email
                        if (empty(ShipmentObject.custom.email) && !empty(order.customerEmail)) {
                            ShipmentObject.custom.email = order.customerEmail;
                        }

                        // Tracking #
                        if (empty(ShipmentObject.custom.trackingNumber)) {
                            ShipmentObject.custom.trackingNumber = trackingNumber;
                        }

                        // Tracking URL
                        if (empty(ShipmentObject.custom.trackingURL)) {
                            // Set Tracking URL if Empty
                            var trackingURL = ShippingUtil.getTrackingURL(confirmedShipments[i].CarrierCode, confirmedShipments[i].TrackingNumber);

                            if (trackingURL) {
                                ShipmentObject.custom.trackingURL = trackingURL;
                            }
                        }

                        // Shipping Address
                        var shipmentAddress = order.shipments[0].shippingAddress;
                        var billingAddress = order.billingAddress;
                        if (!empty(shipmentAddress)) {
                            if (!empty(shipmentAddress.address1)) {
                                ShipmentObject.custom.shippingAddress1 = shipmentAddress.address1;
                            }
                            if (!empty(shipmentAddress.address2)) {
                                ShipmentObject.custom.shippingAddress2 = shipmentAddress.address2;
                            }
                            if (!empty(shipmentAddress.city)) {
                                ShipmentObject.custom.shippingCity = shipmentAddress.city;
                            }
                            if (!empty(shipmentAddress.stateCode)) {
                                ShipmentObject.custom.shippingState = shipmentAddress.stateCode;
                            }
                            if (!empty(shipmentAddress.postalCode)) {
                                ShipmentObject.custom.shippingPostalCode = shipmentAddress.postalCode;
                            }
                            if (empty(ShipmentObject.custom.firstName) && !empty(shipmentAddress.firstName)) {
                                ShipmentObject.custom.firstName = shipmentAddress.firstName;
                            }
                            if (empty(ShipmentObject.custom.lastName) && !empty(shipmentAddress.lastName)) {
                                ShipmentObject.custom.lastName = shipmentAddress.lastName;
                            }
                            if (!empty(billingAddress.firstName)) {
                                ShipmentObject.custom.billingFirstName = billingAddress.firstName;
                            }
                        }

                        Transaction.commit();
                        // ==================  End Transaction  ===================== */
                    } catch (e) {
                        errMsg = 'ERROR Unable to create custom object:\n\t';
                        errMsg += Object.keys(e).map(function (key) {
                            return '\n\t' + key + ': ' + e[key];
                        }).join();
                        log.error(errMsg);
                        Transaction.rollback();
                    }
                } else {
                    log.warn('SKU: {0} not found in catalog', productID);
                }
            } else {
                log.warn('No SKU sent in shipment');
            }
        }

        // Loop through shipments and add product line items to the shipment custom object
        var keys = Object.keys(shipmentProductLineItems);
        if (keys.length) {
            keys.forEach(function (key) {
                var CreatedShipmentObject = CustomObjectMgr.getCustomObject('OrderTransactionalEmails', key);
                if (!empty(CreatedShipmentObject)) {
                    try {
                        Transaction.begin();
                        CreatedShipmentObject.custom.productLineItems = JSON.stringify(shipmentProductLineItems[key]);
                        Transaction.commit();
                    } catch (e) {
                        errMsg = 'ERROR Adding product line items to custom object:\n\t';
                        errMsg += Object.keys(e).map(function (property) {
                            return '\n\t' + property + ': ' + e[property];
                        }).join();
                        log.error(errMsg);
                        Transaction.rollback();
                    }
                }
            });
        } else {
            log.warn('No Products found for shipment that are in order.');
            return false;
        }
    }

    return true;
}

function isObjectHasOwnProperty(object, argArray) {
    return Object.prototype.hasOwnProperty.call(object, argArray);
}

function createOmsPaymentProcessesRecord(orderNo, omsStatus, isRefund, isCapture, settlementAmount, refundAmount) {
    Transaction.wrap(function () {
        var omsPaymentProcess = CustomObjectMgr.createCustomObject('OmsPaymentProcesses', require('dw/util/UUIDUtils').createUUID());
        omsPaymentProcess.custom.orderNo = orderNo;
        omsPaymentProcess.custom.omsOrderStatus = omsStatus;
        omsPaymentProcess.custom.isCapture = empty(isCapture) ? false : isCapture;
        omsPaymentProcess.custom.isRefund = empty(isRefund) ? false : isRefund;
        omsPaymentProcess.custom.captureAmount = settlementAmount == null ? 0 : settlementAmount;
        omsPaymentProcess.custom.refundAmount = refundAmount == null ? 0 : refundAmount;
    });
}

// eslint-disable-next-line valid-jsdoc
/**
 * Creates card processing objects
 *
 */
function createCardProcessingTask(order) {
    if (!empty(order)) {
        /*
         * 1. Check if order needs to capture
         * 2. Check if order paid via paypal and needs to cancel
         *
         * If any of the above are needed, then create the custom objects appropriately.
         */
        var isCaptured = isObjectHasOwnProperty(order.custom, 'isCaptured') ? order.custom.isCaptured : false;
        var settlementAmount = isObjectHasOwnProperty(order.custom, 'settlementAmount') ?
            order.custom.settlementAmount : null;
        var isRefunded = isObjectHasOwnProperty(order.custom, 'isRefunded') ? order.custom.isRefunded : false;
        var refundAmount = isObjectHasOwnProperty(order.custom, 'refundAmount') ?
            order.custom.refundAmount : null;
        /* Disabled because oms requirement changed.
        var omsStatus = isObjectHasOwnProperty(order.custom, 'omsStatus') ?
            order.custom.omsStatus : null;

         */
        var methodName = order.paymentInstrument.paymentMethod;

        if (methodName === "PAYONACCOUNT") return;
        /*
         * Create capture custom object
         */
        if (!empty(settlementAmount) && isCaptured && !isRefunded && empty(refundAmount) && (methodName !== "PAYMENTOPERATOR_PAYPAL" || methodName !== "PAYMENTOPERATOR_PAYPALEXPRESS")) {
            var setAmount = new Money(settlementAmount, 'USD');
            if (setAmount > 0) {
                createOmsPaymentProcessesRecord(order.orderNo, order.custom.omsStatus, false, isCaptured, settlementAmount, 0);
            }
        }
        /*
         * Create refund custom object
         */
        if (!empty(refundAmount) && isRefunded) {
            var RefAmount = new Money(refundAmount, 'USD');
            if (RefAmount > 0) {
                createOmsPaymentProcessesRecord(order.orderNo, order.custom.omsStatus, isRefunded, false, 0, refundAmount);
            }
        }
    }
}


/**
 * Creates Order Transactional Email Objects
 * @param {dw.order} order: Order Object
 */
function createOrderTransactionalEmail(order) {
    if (!empty(order)) {
        var OrderEmailObject;

        /*
         * 1. Check if cancellation email needs to be sent
         * 2. Check if refund email needs to be sent
         * 3. Check if shipment confirmation email needs to be sent
         *
         * If any of the above are needed, then create the custom objects appropriately.
         */

        // Cancellation and Refund Check
        if (order.status.value === order.ORDER_STATUS_CANCELLED ||
            (!empty(order.custom.omsStatus) && order.custom.omsStatus === 'canceled')) {
            if (!empty(order.custom.isRefunded) && order.custom.isRefunded) {
                OrderEmailObject = CustomObjectMgr.getCustomObject('OrderTransactionalEmails', order.orderNo + '-refund');

                if (empty(OrderEmailObject)) {
                    OrderEmailObject = CustomObjectMgr.createCustomObject('OrderTransactionalEmails', order.orderNo + '-refund');
                }

                try {
                    Transaction.begin();
                    OrderEmailObject.custom.emailType = 'orderRefund';
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                }
            } else {
                OrderEmailObject = CustomObjectMgr.getCustomObject('OrderTransactionalEmails', order.orderNo + '-cancellation');

                if (empty(OrderEmailObject)) {
                    OrderEmailObject = CustomObjectMgr.createCustomObject('OrderTransactionalEmails', order.orderNo + '-cancellation');
                }

                try {
                    Transaction.begin();
                    OrderEmailObject.custom.emailType = 'orderCancellation';
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                }
            }

            // Set order number if not set
            if (empty(OrderEmailObject.custom.orderNumber)) {
                try {
                    Transaction.begin();
                    OrderEmailObject.custom.orderNumber = order.orderNo;
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                }
            }

            if (empty(OrderEmailObject.custom.amountRefunded)) {
                OrderEmailObject.custom.amountRefunded = order.totalGrossPrice.toFormattedString();
            }

            // Set customer details if not set
            if (empty(OrderEmailObject.custom.email) && !empty(order.customerEmail)) {
                try {
                    Transaction.begin();
                    OrderEmailObject.custom.email = order.customerEmail;
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                }
            }

            if (empty(OrderEmailObject.custom.firstName) && !empty(order.billingAddress.firstName)) {
                try {
                    Transaction.begin();
                    OrderEmailObject.custom.firstName = order.billingAddress.firstName;
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                }
            }

            if (empty(OrderEmailObject.custom.lastName) && !empty(order.billingAddress.lastName)) {
                try {
                    Transaction.begin();
                    OrderEmailObject.custom.lastName = order.billingAddress.lastName;
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                }
            }

            if (empty(OrderEmailObject.custom.billingFirstName) && !empty(order.billingAddress.firstName)) {
                try {
                    Transaction.begin();
                    OrderEmailObject.custom.billingFirstName = order.billingAddress.firstName;
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                }
            }
        } else {
            createShipmentCustomObjects(order);
        }
    }
}

/**
 * After PATCH
 * @param {dw.order} order: Order Object
 * @param {Object} orderInput: the input data from the REST call
 */
function afterPATCH(order, orderInput) {
    var createMultiShipOrders = false;
    /*eslint-disable */
    if (!empty(request.httpParameters) && request.httpParameters.createMultiShipOrders[0]) {
        createMultiShipOrders = true;
    }
    /* eslint-enable */
    if (createMultiShipOrders && order.shipments.length > 1) {
        // execute post process
        var ProcessMultiShipOrders = require('int_jde/cartridge/scripts/checkout/ProcessMultiShipOrders');
        ProcessMultiShipOrders.createOrderFromShipment(order);
        return;
    }

    if (!empty(order.custom.shipmentUUID)) {
        // get parent order
        var OrderMgr = require('dw/order/OrderMgr');
        var parentOrder = OrderMgr.getOrder(order.custom.parentOrderId);
        var Shipment = require('dw/order/Shipment');
        if (!empty(parentOrder)) {
            var shipments = parentOrder.getShipments();
            /*eslint-disable */
            for (var i = 0; i < shipments.length; i++) {
                if (shipments[i].UUID === order.custom.shipmentUUID) {
                    Transaction.wrap(function () {
                        shipments[i].setShippingStatus(Shipment.SHIPPING_STATUS_SHIPPED);
                    });
                }
            }
            /* eslint-enable */
        }
        return;
    }

    if (!empty(order)) {
        // card processing task
        createCardProcessingTask(order);
        // Export Status
        updateExportStatus(order, order.custom.isExportedJDE);
        // Shipment Status
        updateShipmentStatus(order);
        // Payment Status
        if (!empty(order.custom.omsPaymentIndicator) && !empty(order.custom.omsPaymentIndicator.value)) {
            updatePaymentStatus(order, order.custom.omsPaymentIndicator.value);
        }
        // Transactional Emails
        createOrderTransactionalEmail(order);
    }
}

module.exports = {
    afterPATCH: afterPATCH
};
