'use strict';
module.exports = function () {
var sales =  $('.salesuplift-donation').length || $('.salesuplift-donation-nogrid').length ? true : false;
if (sales){
  var percentage = document.getElementById('percentage').innerText;
  var productValue = '';
  var value = '';
  var productPrice = '';
  var su_donation = '';
  var quantitycount = '';
  var quantity = '';
  var products = document.getElementsByClassName('su_donation').length;
  let donationTotal = '';

  setInterval(function setPrice() {
    for (let i = 0; i < products; i++) {
      productValue = $('.strike-through').length ? $('span.value')[i+1] :  $('span.value')[i];
      value = productValue.innerText;
      productPrice = value.split('$')[1];
      quantitycount = '#quantity-' + (i+1);
      quantity = $(quantitycount)[0].selectedIndex + 1;
      donationTotal = parseFloat(parseFloat((percentage / 100)) * parseFloat(productPrice.replace(',', '')));
      su_donation = parseFloat(donationTotal.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]);
      document.getElementsByClassName('su_donation')[i].innerHTML = '$' +  su_donation;
      document.getElementsByClassName('su_donation_modal')[i].innerHTML = '$' +  su_donation;
    }
    },1000);

};
};