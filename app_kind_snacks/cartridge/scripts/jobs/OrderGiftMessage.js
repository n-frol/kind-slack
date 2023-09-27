/* global empty */
'use strict';

/**
 * OrderGiftMessage.js
 *
 * Migrates gift messages onto order
 */

// SFCC system class imports.
var OrderMgr = require('dw/order/OrderMgr');
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var CSVStreamReader = require('dw/io/CSVStreamReader');
var Logger = require('dw/system/Logger');

// Module level declarations.
var log = Logger.getLogger('tokens', 'tokens');

/**
 * Returns the customer data object
 * @param {array} row - Customer Gift Message Data
 * @return {Object} Object - Returns the customer gift message data object
 */
function getGiftData(row) {
    return {
        order_no: row[0],
        sender: row[1],
        recipient: row[2],
        message: row[3]
    };
}

/**
 * Updated orders
 * @param {dw.order.Order} CurrentOrder – Customer's Order
 */
function updateOrder(CurrentOrder) {
    var collections = require('app_storefront_base/cartridge/scripts/util/collections');
    collections.forEach(CurrentOrder.shipments, function (Shipment) {
        Shipment.giftMessage = 'test';
        Shipment.custom.giftRecipient = 'testing';
        Shipment.custom.giftSender = 'tester';
    });
}

/**
 * Executes the migration scirpt
 */
function execute() {
    var giftDirectory = new File(File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'order');
    var giftFile = new File(giftDirectory, 'giftmessages.csv');
    var readGiftFile = new FileReader(giftFile, 'UTF-8');
    var csvReader = new CSVStreamReader(readGiftFile);

    /**
     * Having to disable eslint as it doesn't work
     * with the API for the next two lines
     */

    /* eslint-disable */
    while ((row =csvReader.readNext())) {
        var orderData = getGiftData(row);
        try {
            /* eslint-enable */
            var CurrentOrder = OrderMgr.getOrder(orderData.order_no);

            if (!empty(CurrentOrder)) {
                if (!empty(CurrentOrder.shipments)) {
                    updateOrder(CurrentOrder);
                    log.info(orderData.order_no + ' updated');
                } else {
                    log.info(orderData.order_no + ' shipment not found');
                }
            } else {
                log.error(orderData.order_no + ' not found');
            }
        } catch (e) {
            log.error(orderData.order_no + ' not found');
        }
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
