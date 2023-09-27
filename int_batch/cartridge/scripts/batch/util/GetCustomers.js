/**
 * Returns the customers needed for export
 * @output Customers: Object
*/

// SFCC system class imports.
var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');

// eslint-disable-next-line no-unused-vars
function execute(args)
{
    var Profiles = SystemObjectMgr.getAllSystemObjects('Profile');

    while (Profiles.hasNext()) {
        var Profile = Profiles.next();

        if (!empty(Profile)) {
            var lastModified = Profile.lastModified;

            /**
             * Capture last modified
             */
            if (!empty(lastModified)) {
                var trackedLastModified = Profile.custom.trackedLastModified;
                var writeDate = false;

                if (!empty(trackedLastModified)) {
                    var lastModifiedMil = lastModified.getTime();
                    var trackedMil = trackedLastModified.getTime();
                    var configModifiedDelay = Site.getCurrent().getCustomPreferenceValue('redShiftCustomerModifiedDelay');
                    var modifiedDelay = !empty(configModifiedDelay) ? configModifiedDelay : 120000;
                    if (lastModifiedMil - trackedMil > modifiedDelay) {
                        writeDate = true;
                    }
                } else {
                    writeDate = true;
                }

                if (writeDate) {
                    try {
                        Transaction.begin();
                        Profile.custom.trackedLastModified = lastModified;
                        Transaction.commit();
                    } catch (e) {
                        Transaction.rollback();
                    }
                }
            }
        }
    }

    args.Customers = SystemObjectMgr.getAllSystemObjects('Profile');
    return PIPELET_NEXT;
}
