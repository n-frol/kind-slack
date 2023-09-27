const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('List', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'AddressBook'));

server.prepend('EditAddress', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Edit Address'));

server.prepend('AddAddress', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Add Address'));

server.prepend('SaveAddress', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Save Address'));

module.exports = server.exports();
