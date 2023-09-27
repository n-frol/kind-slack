var processInclude = require('./util');

$(window).on('load', function () {
    processInclude(require('./checkout/changeUpCheckout'));
    processInclude(require('./confirmation/changeUpConfirmation'));
    //processInclude(require('./search/changeUpSearch'));
    processInclude(require('./checkout/changeUpCheckoutSupersize'));
});
