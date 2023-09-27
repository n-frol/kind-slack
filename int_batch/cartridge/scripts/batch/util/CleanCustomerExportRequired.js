/**
* Cleans customer export required for those that were exported.
* @input Customers: dw.util.Iterator
*
*/
var Transaction = require('dw/system/Transaction');

// eslint-disable-next-line no-unused-vars
function execute(args) {

    Transaction.begin();

    while (args.Customers.hasNext()) {
        args.Customers.next().custom.exportRequired = false;
    }

    Transaction.commit();

    return PIPELET_NEXT;
}
