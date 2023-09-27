'use strict';

var addressController = module.superModule;
var server = require('server');

server.extend(addressController);

/**
 * Save housenumber with address
 */
server.append('SaveAddress',
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Logger = require('dw/system/Logger');
        var Transaction = require('dw/system/Transaction');
        var log = Logger.getLogger('paymentOperator', 'paymentOperator');

        var customer = CustomerMgr.getCustomerByCustomerNumber(
            req.currentCustomer.profile.customerNo
        );
        var addressBook = customer.getProfile().getAddressBook();

        // address form object already in view data
        var formInfo = res.getViewData();

        this.on('route:Complete', function () {
            try {
                var addressID = req.querystring.addressId || formInfo.addressId;
                var address = addressBook.getAddress(addressID);

                if (address) {
                    Transaction.wrap(function () {
                        // dotsource custom: set houseNumber
                        address.custom.houseNumber = formInfo.houseNumber || '';
                    });
                }
            } catch (e) {
                var errString = 'PAYMENTOPERATOR_PAYGATE - ' +
                    'ERROR in Address.js at SaveAddress:\n';
                errString += Object.keys(e).map(function (key) {
                    return '\n\t' + key + ': ' + e[key];
                }).join();

                log.error(errString);
            }
        });

        next();
    }
);


module.exports = server.exports();
