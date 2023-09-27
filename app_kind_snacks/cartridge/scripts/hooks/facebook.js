/* eslint-disable */
/* global empty */

'use strict';

var LocalServiceRegistry = require("dw/svc/LocalServiceRegistry");

var body;
var page;

function getHttpService() {
    var fbsvc = LocalServiceRegistry.createService("facebookEvents", {
        createRequest: function (svc, args) {
            var requestMethod = "POST";

            var url = "https://graph.facebook.com/v14.0/1246368232043434/events?access_token=EAAF4YQvwnhQBACZADctOe4Lgd4FEXDWXgzslwUqg3RFAPpGHPA8fYjOjr1asGnZBOZCa3DIt1yiWL3mAKBlUJZCEQpxuFDKoLrZAL63k0u9y8Tui5KKaPuWyREvMYHVrvoCrIbBdI001cBvZAGdVVNGEWMVjhxHkZC6SKZAcoBPxjhjpRwwAlvuocBvNeFWB9Y4ZD";

            svc.setRequestMethod(requestMethod);
            svc.URL = url;
            var data = [{
                event_name: "ViewContent",
                event_time: 1663941952,
                action_source: "website",
                event_source_url: 'test',
                user_data: {
                    client_ip_address: '123.123.123.123',
                    client_user_agent: 'test'
                },
                custom_data: {
                    content_name: 'test'
                }
            }];
            return { data: JSON.stringify(data) };
        },

        parseResponse: function (svc, client) {
            return client.text;
        }
    });

    return fbsvc;
}

function sendPageView(bodyy, pagee, req, theurl) {
    var body = bodyy;
    var page = pagee;
    const now = new Date();
    const secondsSinceEpoch = Math.round(now.getTime() / 1000);
    if (dw.system.Site.current.getCustomPreferenceValue('facebookTestEvent') != null) {
        var data = {
            data: [{
                event_name: "ViewContent",
                event_time: secondsSinceEpoch,
                action_source: "website",
                event_source_url: theurl,
                user_data: {
                    client_ip_address: req.httpRemoteAddress,
                    client_user_agent: req.httpUserAgent
                },
                custom_data: {
                    content_name: body
                }
            }],
            test_event_code: dw.system.Site.current.getCustomPreferenceValue('facebookTestEvent')
        };
    } else {
        var data = {
            data: [{
                event_name: "ViewContent",
                event_time: secondsSinceEpoch,
                action_source: "website",
                event_source_url: theurl,
                user_data: {
                    client_ip_address: req.httpRemoteAddress,
                    client_user_agent: req.httpUserAgent
                },
                custom_data: {
                    content_name: body
                }
            }]};
    }
    var callPost = LocalServiceRegistry.createService("facebookEvents", {
        createRequest: function(svc: HTTPService, args) { // eslint-disable-line unexpected-token
            // Default request method is post
            // No need to setRequestMethod
            if (args) {
                svc.addHeader("Content-Type", "application/json");
                return JSON.stringify(args);
            } else {
                return null;
            }
        },
        parseResponse: function(svc: HTTPService, client: HTTPClient) {
            return client.text;
        }
    });
    callPost.setURL(dw.system.Site.current.getCustomPreferenceValue("facebookEndpoint")+"/"+dw.system.Site.current.getCustomPreferenceValue('facebookPixel')+"/events?access_token="+dw.system.Site.current.getCustomPreferenceValue('facebookAccessToken'));
    var result = callPost.call(data);
    var qq = "";
}

function sendAddToCart(bodyy, pagee, req) {
    const now = new Date();
    const secondsSinceEpoch = Math.round(now.getTime() / 1000);
    if (dw.system.Site.current.getCustomPreferenceValue('facebookTestEvent') != null) {
        var data = {
            data: [{
                event_name: "Add To Cart",
                event_time: secondsSinceEpoch,
                action_source: "website",
                event_source_url: req.httpReferer,
                user_data: {
                    client_ip_address: req.httpRemoteAddress,
                    client_user_agent: req.httpUserAgent
                },
                custom_data: {}
            }],
            test_event_code: dw.system.Site.current.getCustomPreferenceValue('facebookTestEvent')
        };
    } else {
        var data = {
            data: [{
                event_name: "Add To Cart",
                event_time: secondsSinceEpoch,
                action_source: "website",
                event_source_url: req.httpReferer,
                user_data: {
                    client_ip_address: req.httpRemoteAddress,
                    client_user_agent: req.httpUserAgent
                },
                custom_data: {}
            }]
        };
    }
    var callPost = LocalServiceRegistry.createService("facebookEvents", {
        createRequest: function(svc: HTTPService, args) {
            // Default request method is post
            // No need to setRequestMethod
            if (args) {
                svc.addHeader("Content-Type", "application/json");
                return JSON.stringify(args);
            } else {
                return null;
            }
        },
        parseResponse: function(svc: HTTPService, client: HTTPClient) {
            return client.text;
        }
    });
    callPost.setURL(dw.system.Site.current.getCustomPreferenceValue("facebookEndpoint")+"/"+dw.system.Site.current.getCustomPreferenceValue('facebookPixel')+"/events?access_token="+dw.system.Site.current.getCustomPreferenceValue('facebookAccessToken'));
    var result = callPost.call(data);
    var qq = "";
}

function sendPurchase(body, order, req) {
    const now = new Date();
    const secondsSinceEpoch = Math.round(now.getTime() / 1000);
    if (dw.system.Site.current.getCustomPreferenceValue('facebookTestEvent') != null) {
        var data = {
            data: [{
                event_name: "Purchase",
                event_time: secondsSinceEpoch,
                action_source: "website",
                event_source_url: body.httpReferer,
                user_data: {
                    client_ip_address: body.httpRemoteAddress,
                    client_user_agent: body.httpUserAgent
                },
                custom_data: {
                    currency: order.currencyCode,
                    value: order.totalGrossPrice.value,
                    num_items: order.productLineItems.length
                }
            }],
            test_event_code: dw.system.Site.current.getCustomPreferenceValue('facebookTestEvent')
        };
    } else {
        var data = {
            data: [{
                event_name: "Purchase",
                event_time: secondsSinceEpoch,
                action_source: "website",
                event_source_url: body.httpReferer,
                user_data: {
                    client_ip_address: body.httpRemoteAddress,
                    client_user_agent: body.httpUserAgent
                },
                custom_data: {
                    currency: order.currencyCode,
                    value: order.totalGrossPrice.value,
                    num_items: order.productLineItems.length
                }
            }]
        };
    }
    var callPost = LocalServiceRegistry.createService("facebookEvents", {
        createRequest: function(svc: HTTPService, args) {
            // Default request method is post
            // No need to setRequestMethod
            if (args) {
                svc.addHeader("Content-Type", "application/json");
                return JSON.stringify(args);
            } else {
                return null;
            }
        },
        parseResponse: function(svc: HTTPService, client: HTTPClient) {
            return client.text;
        }
    });
    callPost.setURL(dw.system.Site.current.getCustomPreferenceValue("facebookEndpoint")+"/"+dw.system.Site.current.getCustomPreferenceValue('facebookPixel')+"/events?access_token="+dw.system.Site.current.getCustomPreferenceValue('facebookAccessToken'));
    var result = callPost.call(data);
    var qq = "";
}

module.exports = {
    sendPageView: sendPageView,
    sendAddToCart: sendAddToCart,
    sendPurchase: sendPurchase
};
