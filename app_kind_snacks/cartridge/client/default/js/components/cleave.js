'use strict';

var base = require('base/components/cleave');
var Cleave = window.Cleave || require('cleave.js');

base.handleCreditCardNumber = function (cardFieldSelector, cardTypeSelector) {
    var cleave = new Cleave(cardFieldSelector, {
        creditCard: true,
        onCreditCardTypeChanged: function (type) {
            var creditCardTypes = {
                visa: 'Visa',
                mastercard: 'Master Card',
                amex: 'Amex',
                dankort: 'Dankort',
                discover: 'Discover',
                diners: 'DinersClub',
                jcb: 'Jcb',
                maestro: 'Maestro',
                unknown: 'Unknown'
            };

            var cardType = creditCardTypes[Object.keys(creditCardTypes).indexOf(type) > -1
                ? type
                : 'unknown'];
            $(cardTypeSelector).val(cardType);
            $('.card-number-wrapper').attr('data-type', type);
            if (type === 'visa' || type === 'mastercard' || type === 'discover') {
                $('.securityCode').attr('maxlength', 3);
            } else {
                $('.securityCode').attr('maxlength', 4);
            }
        }
    });

    $(cardFieldSelector).data('cleave', cleave);
};

base.serializeData = function (form) {
    var serializedArray = form.serializeArray();

    serializedArray.forEach(function (item, i) {
        if (item.name.indexOf('cardNumber') > -1 &&
            !(item.name.indexOf('creditdirect_cardNumber') > -1)
        ) {
            item.value = $('#cardNumber').data('cleave').getRawValue(); // eslint-disable-line
        }
        if (item.name.indexOf('creditdirect_cardNumber') > -1) {
            item.value = $('#creditDirectCardNumber').data('cleave').getRawValue(); // eslint-disable-line
        }
    });

    return $.param(serializedArray);
};

module.exports = base;
