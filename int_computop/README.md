__Documentation for the SFCC integration cartridge int_computop__

# Overview
The `int_computop` cartridge provides an overlay for making service calls to the Computop Payment Gateway (Paygate) in order to authorize and charge transactions to credit cards or several other types of payments. The cartridge implements a new SFCC PaymentProcessor in order to complete orders. The cartridge provides the ability to handle many additional charte types i

## Cartridge Dependencies
* This cartridge acts as an overlay cartridge for the __Storefront Reference Architecture (SFRA)__ reference application only. There are alternate LINK integration cartridges for use with SiteGenesis (controllers or pipelines) that can be downloaded from the exchange or the Computop documentation site [1].

# Implementation Details
The implementation of the computop cartridge has many touch points and can vary greatly depending on what your requirements are. There are a large number of payment methods offered through the Computop Paygate (will be referred to simply as Paygate going forward). These include Credit (iframe form), Direct Credit (server-to-server auth), PayPal, PayPal Express, and many more.

## Metadata
The metadata for this cartridge is usually packaged together with the cartridge and can be imported from SFCC Business Manager's *Administration > Site Import/Export* module. The metadata can also be added to the migrations folder for a project and added as a migration, then imported using the dwre migrations commands.

## Known Issues & Challenges
* __ISSUE:__ If you are adding a card to a user profile from the `PaymentInstruments-AddPayment` page, the result will always come back as failed because the check for the success condition is not correct:
    * The conditional is checking if the `Status` property of the paygate return data object is equal to the string *'succsess'*. The problem is that the `Status` property returns the string *'OK'* when the result from the API is retrieved successfully and not *'success'*.
    ```javascript
    if (paygateData.get('Status').toLowerCase() !== 'success') {
        throw new Error(
            Resource.msg('paymentoperator.error.details.default', 'paymentoperatorerrordetails', null)
        );
    }
    ```
* __FIX:__
    * __File to Change:__ `int_computop/cartridge/controllers/PaymentInstrument.js`
    * __Code Change:__
    ```javascript
    if (paygateData.get('Status').toLowerCase() !== 'ok') {
        throw new Error(
            Resource.msg('paymentoperator.error.details.default', 'paymentoperatorerrordetails', null)
        );
    }
    ```


# References
1. [__Computop Documentation Download Site__ ](https://www.computop.com/us/downloads/)