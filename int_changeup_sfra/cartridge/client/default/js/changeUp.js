var processInclude = require('./util');

$(document).ready(function () {
    processInclude(require('./checkout/changeUpCheckout'));
    processInclude(require('./confirmation/changeUpConfirmation'));
    processInclude(require('./search/changeUpSearch'));
    processInclude(require('./checkout/changeUpCheckoutSupersize'));
    processInclude(require('./page/details'));
});
