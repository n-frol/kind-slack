const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('Show', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'My Account'));

server.prepend('MSI', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'My Subscriptions'));

server.prepend('EditProfile', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Edit Profile'));

server.prepend('EditPassword', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Edit Password'));

server.prepend('SaveProfile', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Save Profile'));

server.prepend('PasswordReset', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Password Reset'));

server.prepend('PasswordResetDialogForm', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT));

server.prepend('SetNewPassword', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'New Password'));

module.exports = server.exports();
