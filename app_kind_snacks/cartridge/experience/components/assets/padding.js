/* eslint-disable */
'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');

/**
 * Render logic for richtext component
 */
module.exports.render = function (context) {
    var model = new HashMap();
    var content = context.content;

    model.amount = content.amount ? content.amount : 0;
    model.amount_mobile = content.amount_mobile ? content.amount_mobile : content.amount;
    model.amount_tablet = content.amount_tablet ? content.amount_tablet : content.amount_mobile;
    model.idd = Math.floor(Math.random() * 999999) + 1 + 'A';
    model.bg = content.bg;
    model.usemargins = content.use_margins;

    model.amount = parseInt(model.amount, 10);
    model.amount_mobile = parseInt(model.amount_mobile, 10);
    model.amount_tablet = parseInt(model.amount_tablet, 10);

    return new Template('experience/components/assets/padding').render(model).text;
};
