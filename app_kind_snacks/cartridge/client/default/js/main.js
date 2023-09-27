/* eslint-disable */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
window.jQuery = window.$ = require("jquery");
var processInclude = require("base/util");
var GTM = require("int_googletagmanager/GTM.js");
const imageCarousel = require("./product/imageCarousel");

// Don't wait on DOM for these
processInclude(require("./components/polyfills"));

$(document).ready(function () {
    // Modules who export an object whose every function we don't want to necessarily loop through via processInclude
    var aToggle = require("./toggleActiveClass.js");
    var menu = require("./components/menu");

    aToggle.init();
    menu.init();
    // Pull in select files from SFRA main.js
    processInclude(require("base/components/cookie"));
    processInclude(require("base/components/consentTracking"));
    processInclude(require("base/components/footer"));
    processInclude(require("base/components/countrySelector"));
    processInclude(require("./components/search"));
    processInclude(require("./knd-legacy"));
    processInclude(require("./byob/byobCategoryNav"));
    processInclude(require("./byob/byobList"));
    processInclude(require("./byob/components/bybQtyInput"));
    processInclude(require("./creativeSnacks"));
    processInclude(require("./components/activeNav"));
    processInclude(require("./components/clientSideValidation"));
    processInclude(require("./components/collapsibleItem"));
    processInclude(require("./components/dialogModal"));
    processInclude(require("./components/mcSubscribe"));
    processInclude(require("./components/miniCart"));
    processInclude(require("./components/qtyInput"));
    processInclude(require("./components/stickyElem"));
    processInclude(require("./components/stickyHeader"));
    processInclude(require("./components/accordion"));
    processInclude(require("./components/layout"));
    processInclude(require("./components/localeSwitcher"));
    // processInclude(require('./components/pageUtils'));
    processInclude(require("./components/tabCustomizations"));
    processInclude(require("./components/tipsGenerator"));
    processInclude(require("./components/apply"));
    processInclude(require("./components/sliders"));
    processInclude(require("./components/pagedesigner"));
    processInclude(require("./dataTables"));
    //processInclude(require("./tracking/uaTracking"));
    processInclude(require("accelerator/components/dailyTimeline"));
});

require("base/thirdParty/bootstrap");
require("base/components/spinner");
require("slick-carousel");
const carousel = require("bootstrap/js/src/carousel");

GTM.init();
setInterval(function () {
    var buttonCount = $(".add-to-cart").length;
    var buttonCount2 = $(".checkout-btn").length;
    var buttonCount3 = $(".apple-pay-cart").length;
    var totalButton = buttonCount + buttonCount2 + buttonCount3;
    var w = $(window).width();
    if (w < 440) {
        if ($("#linc-web-chat-iframe").hasClass("chat")) {
            $("#linc-web-chat-iframe").css("bottom", "0px");
        } else {
            totalButton *= 70;
            $("#linc-web-chat-iframe").css("bottom", totalButton + "px");
        }
    }
    $('.js-slider:not(".slick-initialized, .prodcara")').each(function () {
        imageCarousel.init();
    });
}, 1000);

$(document).ready(function () {
    if (window.location.href.indexOf("login") <= -1) {
        $(".c-product-details__steps__backstep-arrow").attr(
            "href",
            "/chooseyoursnacks"
        );
    }
    if (window.location.href.indexOf("build-your-own-box-MBYOB") > -1) {
        $(".og-on-radio").first().click();
    }
    if (navigator.userAgent.indexOf("Firefox") !== -1) {
        $(".movedown").css("top", "-10px");
    }
    if (window.location.href.indexOf("login") <= -1) {
        $("#js-loginradius-container-login").attr(
            "data-lr-forwarding-url",
            window.location
        );
        $("#js-loginradius-container-login").data(
            "lr-forwarding-url",
            window.location
        );
    }
    if (window.location.href.indexOf("cgid=swap") > -1) {
        $(".c-refinements__values__item__link").each(function (ele) {
            var theurl = $(this).attr("href");
            if (theurl.indexOf("cgid=byob") > -1) {
                var replaceurl = theurl.replace("cgid=byob", "cgid=swap");
                $(this).attr("href", replaceurl);
            }
        });
        if (window.location.href.indexOf("ref=account") > -1) {
            $(".swapbarconfirm").attr("href", "/account");
        } else {
            $(".swapbarconfirm").attr("href", "/cart");
        }
    }
});

$(".swapthebar").on("click", function () {
    var pid = $(this).attr("data-item-pid");
    var theurl = $(this).attr("data-addurl");
    $.ajax({
        method: "POST",
        url: theurl + "?pid=" + pid,
        data: { pid: pid },
    }).done(function (addRespData, status, xhr) {
        const $listContainer = $(".js-byob-list-body-wrap");
        $listContainer.empty().html(addRespData);
    });
});

$("#donation-check-fake-supersize").on("click", function () {
    $("#donation-checkbox-supersize").click();
    if ($("#donation-checkbox-supersize").hasClass("checked")) {
        $("#donation-check-fake-supersize").prop("checked", true);
    } else {
        $("#donation-check-fake-supersize").prop("checked", false);
    }
});

$(function () {
    var tagElement = $(".slick-slide:not(.slick-cloned) .caro_0");
    var imgElement = $(".slick-slide:not(.slick-cloned) .caro_0 img");
    var hotspotdata = $(".carousel-inner").attr("data-hotspots");
    var hotspots = [];

    hotspots = JSON.parse(hotspotdata);
    if (hotspots == null) {
        hotspots = [];
    }

    rebuildHotspotList();

    $.each(hotspots, function (ind, hotspot) {
        showHotspot(hotspot);
    });

    $(".toggleHotspotAdmin").on("click", function () {
        $(".hotspot_admin").toggle();
        var theslides = $(".prodcara .slick-slide:not(.slick-cloned)");
        $.each(theslides, function (index, val) {
            var imgsrc = $(this).find("img").attr("src");
            $(".attach_hotspot_to").append(
                "<img data-hsindex='" +
                    index +
                    "' class='attachHotspot' style='width:100px;' src='" +
                    imgsrc +
                    "' />"
            );
        });
    });

    function randomIntFromInterval(min, max) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    $(document).on("click", ".generateHotspotCode", function () {
        $(".hotspotcode").html(JSON.stringify(hotspots));
    });

    $(document).on("click", ".attachHotspot", function () {
        $(".attachHotspot").css("border", "none");
        var index = $(this).attr("data-hsindex");
        tagElement = $(".slick-slide:not(.slick-cloned) .caro_" + index);
        imgElement = $(
            ".slick-slide:not(.slick-cloned) .caro_" + index + " img"
        );
        attachHotspotTo($(this));
    });

    function attachHotspotTo(element) {
        var hso = $(".hsoverlay");
        if (hso.length == 0) {
            element.css("border", "3px solid black");
            var tHeight = $(tagElement[0]).height();
            var tWidth = $(tagElement[0]).width();
            var tOffset = tagElement.offset();
            var pHeight = $(imgElement[0]).height();
            var pWidth = $(imgElement[0]).width();
            var pOffset = imgElement.offset();

            $("<span/>", {
                html: "<p>This is Admin-mode. Click this Pane to Store Messages</p>",
            })
                .css({
                    height: (tHeight / pHeight) * 100 + "%",
                    width: (tWidth / pWidth) * 100 + "%",
                    left: tOffset.left - pOffset.left + "px",
                    top: tOffset.top - pOffset.top + "px",
                })
                .addClass("hsoverlay")
                .appendTo(tagElement);
            $(".toggleHotspotAdmin").css("background", "green");
        } else {
            element.css("border", "none");
            $(".toggleHotspotAdmin").css("background", "red");
            hso.remove();
        }
    }

    function showHotspot(hotspot) {
        var tagElement = $(
            ".slick-slide:not(.slick-cloned) .caro_" + hotspot.p
        );
        var imgElement = $(
            ".slick-slide:not(.slick-cloned) .caro_" + hotspot.p + " img"
        );

        var spot_html = $("<div/>");

        $.each(hotspot, function (index, val) {
            if (typeof val === "string" && index !== "p") {
                $("<div/>", {
                    html: val,
                })
                    .addClass("Hotspot_" + index)
                    .appendTo(spot_html);
            }
        });

        var height = $(tagElement[0]).height(),
            width = $(tagElement[0]).width(),
            offset = tagElement.offset(),
            parent_offset = imgElement.offset();

        var spot = $("<div/>", {
            html: spot_html,
        })
            .css({
                top:
                    (hotspot.y * height) / 100 +
                    (offset.top - parent_offset.top) +
                    "px",
                left:
                    (hotspot.x * width) / 100 +
                    (offset.left - parent_offset.left) +
                    "px",
            })
            .addClass("HotspotPlugin_Hotspot")
            .addClass("hotspot_index_" + hotspot.index)
            .attr("data-body", hotspot.body)
            .attr("data-header", hotspot.header)
            .attr("data-index", hotspot.index)
            .attr("data-x", hotspot.x)
            .attr("data-y", hotspot.y)
            .appendTo(tagElement);
        rebuildHotspotList();
    }

    $(document).on("click", ".hsoverlay", function (event) {
        var offset = $(this).offset(),
            relativeX = event.pageX - offset.left,
            relativeY = event.pageY - offset.top;

        var height = $(tagElement[0]).height(),
            width = $(tagElement[0]).width();

        var hindex = Math.max(...hotspots.map((o) => o.index), 1);

        var thein = $(this).parent().attr("data-index");

        var hotspot = {
            p: thein,
            x: (relativeX / width) * 100,
            y: (relativeY / height) * 100,
            index: hindex + 1,
            header: "<b>test header</b>",
            body: "test body here",
        };
        hotspots.push(hotspot);
        showHotspot(hotspot);
    });
    $(document).on("click", ".hotspotlistitem", function (event) {
        $(".hotspotlistitem").css("background", "#fff");
        $(this).css("background", "#aaa");
        $(".HotspotPlugin_Hotspot").css("background", "green");
        $(".hotspot_index_" + $(this).attr("data-hsindex")).css(
            "background",
            "red"
        );
    });
    $(document).on("click", ".deletehotspot", function () {
        $(".hotspot_index_" + $(this).attr("data-hsindex")).remove();
        hotspots = hotspots.filter(
            (item) => item.index != $(this).attr("data-hsindex")
        );
        rebuildHotspotList();
    });
    $(document).on("keyup", ".hotspot_header_editor", function () {
        var t = $(this).val();
        var index = $(this).attr("data-hsindex");
        $(".hotspot_index_" + index + " .Hotspot_header").html(t);
        $(".hotspot_index_" + index).attr("data-header", t);
        for (const obj of hotspots) {
            if (obj.index == index) {
                obj.header = t;

                break;
            }
        }
    });
    $(document).on("keyup", ".hotspot_body_editor", function () {
        var t = $(this).val();
        var index = $(this).attr("data-hsindex");
        $(".hotspot_index_" + index + " .Hotspot_body").html(t);
        $(".hotspot_index_" + index).attr("data-body", t);
        for (const obj of hotspots) {
            if (obj.index == index) {
                obj.body = t;

                break;
            }
        }
    });

    function rebuildHotspotList() {
        $(".hotspottable tbody").html("");
        var hotspotsfound = $(".HotspotPlugin_Hotspot");
        $.each(hotspots, function (ind, hotspot) {
            var trhtml =
                "<tr class='hotspotlistitem' data-hsindex='" +
                hotspot.index +
                "'>" +
                "<td>" +
                hotspot.p +
                "</td>" +
                "<td>" +
                hotspot.index +
                "</td>" +
                "<td>" +
                hotspot.x +
                "</td>" +
                "<td>" +
                hotspot.y +
                "</td>" +
                "<td><input class='hotspot_header_editor' data-hsindex='" +
                hotspot.index +
                "' value='" +
                hotspot.header +
                "' /> <input class='hotspot_body_editor' data-hsindex='" +
                hotspot.index +
                "' value='" +
                hotspot.body +
                "' /> </td>" +
                "<td class='deletehotspot' data-hsindex='" +
                hotspot.index +
                "'><span style='margin-left:20px; cursor:pointer'>&#128465</span></td>" +
                "</tr>";
            $(".hotspottable > tbody:last-child").append(trhtml);

            // $(".hotspotlist").append("" +
            //     "<div class='hotspotlistitem' data-hsindex='"+$(this).attr('data-index')+"'>"+$(this).attr('data-x')+"/"+$(this).attr('data-y')+"  :  "+$(this).attr('data-index')+"  " +
            //     "<input class='hotspot_header_editor' data-hsindex='"+$(this).attr('data-index')+"' value='"+$(this).attr("data-header")+"'>"+
            //     "<input class='hotspot_body_editor' data-hsindex='"+$(this).attr('data-index')+"'value='"+$(this).attr("data-body")+"'>"+
            //     "<span class='deletehotspot' data-hsindex='"+$(this).attr('data-index')+"' style='margin-left:20px'>&#128465</span></div>");
        });
    }

    $(document).on("change", ".connected_input", function () {
        var v = $(this).val();
        var url = $(".connected_input_url").attr("data-url");
        $.ajax({
            url: url,
            type: "get",
            data: {
                plist: v,
            },
            success: function (resp) {
                $(".connected_container").html(resp);
            },
        });
    });
    $(document).on("keyup", ".connected_search", function () {
        var v = $(this).val();
        if (v.length < 2) {
            return;
        }
        var url = $(".connected_input_search").attr("data-url");
        $.ajax({
            url: url,
            type: "get",
            data: {
                term: v,
            },
            success: function (resp) {
                $(".connected_results").html(resp);
            },
        });
    });

    $(document).on("click", ".connected_result_item", function () {
        var cur = $(".connected_input").val();
        if (cur === "") {
            $(".connected_input").val($(this).attr("data-id"));
        } else {
            $(".connected_input").val(cur + "," + $(this).attr("data-id"));
        }
        $(".connected_input").trigger("change");
    });
    $(document).on("keyup", ".connected_search", function () {
        var v = $(this).val();
        if (v.length < 2) {
            return;
        }
        var url = $(".connected_input_search").attr("data-url");
        $.ajax({
            url: url,
            type: "get",
            data: {
                term: v,
            },
            success: function (resp) {
                $(".connected_results").html(resp);
            },
        });
    });


    $(document).on("click", ".connected_result_item", function () {
        var cur = $(".connected_input").val();
        if (cur === "") {
            $(".connected_input").val($(this).attr("data-id"));
        } else {
            $(".connected_input").val(cur + "," + $(this).attr("data-id"));
        }
        $(".connected_input").trigger("change");
    });
});
$(document).on("click", ".notifyme", function () {
    $(".notify_sku").val($(this).attr("data-sku"));
    $(".notifyme_prodname").html($(this).attr("data-name"));
    $(".notify_success").hide();
    $(".notify_error").hide();
    $(".notify_form").show();
});
$(document).on("click", ".notifyme-submit", function () {
    var fname = $(".notify_fname").val();
    var lname = $(".notify_lname").val();
    var email = $(".notify_email").val();
    if (fname === "" || lname === "" || email === "") {
        $(".notifyme-error").html("Please fill all fields");
        return;
    }
    var data = {
        name: $(".notify_fname").val() + " " + $(".notify_lname").val(),
        email: $(".notify_email").val(),
        sku: $(".notify_sku").val(),
    };
    $.ajax({
        method: "POST",
        url: $(this).attr("data-url"),
        data: data,
        success: function (res) {
            $(".notify_success").show();
            $(".notifyme-error").hide();
            $(".notify_form").hide();
        },
    });
    });

$(document).on("click", ".nothanks-wholesale", function () {
    $(".checkout-popup").hide();
    createCookie("wholesale_show_popup", "no", 30);
    $.ajax({
        method: "POST",
        url: "/wholesaleoptout",
        data: {
            email: "test@test.com"
        }
    });
});

$(function () {
   var wholesale_cookie = getCookie("wholesale_show_popup");
   if (wholesale_cookie != "no") {
       $(".checkout-popup").show();
   }
});

function createCookie(name, value, days) {
    var date, expires;
    if (days) {
        date = new Date();
        date.setDate(date.getDate()+days);
        expires = "; expires="+date.toUTCString();
    } else {
        expires = "";
    }
    document.cookie = name+"="+value+expires+"; path=/";
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
