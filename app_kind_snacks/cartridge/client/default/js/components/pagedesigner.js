"use strict";
$(document).ready(function () {
    var myInterval = 0;
    var isEnabled = $('#yotpoEnabled').val() === 'true';
    $(".fullheight").parent().addClass("maxheight");
    $(".region").has(".experience-assets-benefits").addClass("benefitgrid");
    $(".region").has(".experience-assets-hungrykind").addClass("kindmoveleft");
    $(".row").has(".kindmoveleft").addClass("kindmoverow");
    if (navigator.userAgent.match(/(iPod|iPhone|iPad)/) || (navigator.userAgent.match(/(Macintosh)/) && navigator.maxTouchPoints && navigator.maxTouchPoints > 4)) {
        $(".experience-assets-viewpositions").css("height", "430px");
        $(".pure5").css("height", "101.5%");
    }
    if (isEnabled) {
         // eslint-disable-next-line
        myInterval = setInterval(refreshYotpo, 300);
    }
    function refreshYotpo() {
        // eslint-disable-next-line
        if (typeof yotpo !== 'undefined') {
            // eslint-disable-next-line
            var state = yotpo.getState();
            // eslint-disable-next-line
            if (state == "ready") {
                Array.from(document.getElementsByClassName("yotpo-image")).forEach(
                    function (image) {
                        if (image.hasAttribute("data-src")) {
                            image.setAttribute(
                                "src",
                                image.getAttribute("data-src")
                            );
                        }
                    }
                );
                clearInterval(myInterval);
            }
        } else {
            clearInterval(myInterval);
        }
    }
});
