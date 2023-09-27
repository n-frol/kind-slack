/**
 * Returns the orders needed for export
 * @output Orders: Object
*/

var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var Site = require('dw/system/Site');

// eslint-disable-next-line no-unused-vars
function execute(args)
{
    var redshiftCalendarDate = Site.getCurrent().getCustomPreferenceValue('redShiftOrderCollectionTime');

    if (!empty(redshiftCalendarDate)) {
        var ExportDate = new dw.util.Calendar();
        ExportDate.add(ExportDate.DATE, redshiftCalendarDate);
        args.Orders = SystemObjectMgr.querySystemObjects('Order', 'status != {0} AND confirmationStatus = {1} AND creationDate >= {2}', 'creationDate ASC', dw.order.Order.ORDER_STATUS_FAILED, dw.order.Order.CONFIRMATION_STATUS_CONFIRMED, ExportDate.getTime());
    } else {
        args.Orders = null;
    }

    return PIPELET_NEXT;
}
