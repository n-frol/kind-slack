/* global paymentOperatorConfig */

'use strict';

/**
 * Render iframe for fraud protection
 */
function paymorrowInit() {
    if (document.getElementById('paymorrow-iframe')) {
        return;
    }

    try {
        var deviceUrl = paymentOperatorConfig.payMorrowDeviceID;
        var gateUrl = paymentOperatorConfig.paymorrowIframeUrl;

        $.ajax({
            url: deviceUrl,
            success: function (data) {
                if (!data) {
                    return false;
                }
                if (gateUrl + data.deviceid) {
                    var iframe = document.createElement('iframe');
                    iframe.id = 'paymorrow-iframe';
                    iframe.style = 'width: 1px; height: 1px; border: 0; overflow: hidden; display:none !important; visibility:hidden !important; z-index:-9999 !important;';
                    iframe.src = encodeURI(gateUrl + data.deviceid);
                    document.body.appendChild(iframe);
                }
            }
        });
    } catch (ex) {
        // eslint-disable-next-line
        console.warn('Payment operator iframe failed!')
    }
}

module.exports = {
    paymorrowInit: paymorrowInit
};
