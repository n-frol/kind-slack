/* eslint-disable */
$(document).ready(function () {
    var processInclude = require('base/util');
    processInclude(require('./product/quickView'));
    processInclude(require('./components/menu'));
    setTimeout(function () {
        // $.noConflict();
        var total = 0;
        var pageTotal = 0;
        var pricetotal = 0;
        var snacktotal = 0;
        var qtytotal = 0;
        // eslint-disable-next-line
        var datat = $('#example').DataTable({
            "sDom": "<'top'i p>t",
            "pageLength": 6,
            "columnDefs": [
                { targets: [1, 6], visible: false, searchable: true }
            ],
            "footerCallback": function (row, data, start, end, display) {
                $(".qty").change(function () {
                    var cell = $(this).closest('td');
                    $(this).attr('value', $(this).val());
                    datat.cell($(cell)).invalidate();

                    $('.add-to-cart-messages').html("");

                    var minq = $(this).data("minqty");
                    if ($(this).val() < minq && $(this).val() != 0) {
                        $('.add-to-cart-messages').append(
                            '<div class="alert c-alert alert-danger c-alert--danger add-to-basket-alert text-center" role="alert">'
                            + "This item has a minimum purchase quantity of  " + minq + "."
                            + '</div>'
                        );

                        setTimeout(function () {
                            $('.add-to-basket-alert').remove();
                        }, 5000);
                        $(this).attr('value', 0);
                        $(this).addClass("inputerror");
                        datat.cell($(cell)).invalidate();
                    } else {
                        $(".ezadd").removeAttr("disabled");
                        $(this).removeClass("inputerror");
                        if (parseInt($(this).val()) > 0) {
                            $(this).css("border", "2px solid black");
                        } else {
                            $(this).css("border", "0px solid black");
                        }
                    }

                    var snacks = datat.column(3).data().toArray();
                    var prices = datat.column(4).data().toArray();
                    var qtys = datat.column(5).data().toArray();
                    var pricet = 0;
                    var snackt = 0;
                    var qtyt = 0;

                    for (var q = 0; q < qtys.length; q++) {
                        var qt = qtys[q];
                        var qan = $(qt).val();
                        if (qan !== "" && qan != "0") {
                            var qann = parseInt(qan);
                            qtyt += qann;
                            pricet = pricet + ((qann) * parseFloat(prices[q].replace(/[^\d.-]/g, '')));
                            snackt = snackt + ((qann) * parseInt(snacks[q].replace(/[^\d.-]/g, '')));
                        }
                    }
                    $(".pricetotal").html("$" + pricet.toFixed(2));
                    $(".snacktotal").html(snackt + " snacks");
                    $(".qtytotal").html(qtyt);
                });
            }
        });

        $(".dataSearch").click(function () {
            var val = $(this).data("search");
            console.log(val);
            datat.columns(1).search(val).draw();
        });
        $(".ezordersearch").keyup(function () {
            var v = $(".ezordersearch").val();
            datat.search(v).draw();
        });
        $(".pagelen").change(function () {
            datat.page.len($(".pagelen").val()).draw();
        });
        $(".ezadd").click(function () {
            $(".ezerror").html("");
            var snacks = datat.column(3).data().toArray();
            var prices = datat.column(4).data().toArray();
            var qtys = datat.column(5).data().toArray();
            var pids = datat.column(6).data().toArray();
            for (var q = 0; q < qtys.length; q++) {
                var qt = qtys[q];
                var qan = $(qt).val();
                if (qan !== "" && qan != "0") {
                    qan = parseInt(qan);
                    var pid = pids[q];
                    $.ajax({
                        method: "POST",
                        url: "cartadd",
                        data: { pid: pid, quantity: qan },
                        success: function (data) {
                            if (data.error) {
                                $('.add-to-cart-messages').append(
                                    '<div class="alert c-alert alert-danger c-alert--danger add-to-basket-alert text-center" role="alert">'
                                    + data.message
                                    + '</div>'
                                );

                                setTimeout(function () {
                                    $('.add-to-basket-alert').remove();
                                }, 5000);

                                return false;
                            }
                            $('.minicart-quantity').html(data.quantityTotal);
                            $('.minicart .popover').addClass('show');
                            $('.minicart .popover').spinner().start()
                            $.get("/minicartshow", function (data) {
                                $('.minicart .popover').empty();
                                $('.minicart .popover').append(data);
                                $('.minicart .popover').spinner().stop()
                            })
                        },
                    });
                }
            }
            $.ajax({
                method: "GET",
                url: "minicartshow"
            });
            $('.minicart .popover').addClass('show');
        });
    }, 100);
});
