Documentation for the Vertex O-Series tax calculation service integration cartridge: __`int_vertex`__

---
# Summary

The Vertex integration cartridge is an SFCC overlay cartridge that provides tax lookup functionality through the Vertex O-Series Tax Calculation API.

## Intended Use
This cartridge is intended for use with Salesforce's SFRA app. The core service module, and the models for handling the service request/response could be imported and used with Site Genesis without any changes.

## How the Cartridge & Service Work

* The `int_vertex` cartridge is a plugin that can be added to an SFCC website to quickly override the default tax calculation with a call to the Vertex service.
    * The cartridge contains no front-end JS, no controllers or pipelines, no templates, and no styles or images.
    * the cartridge overrides scripts from the app_storefront_base cartridge in order to let the site use the Vertex tax calculation API for calculating basket/order taxes.
    * The cartridge also contains A `.wsdl` (WSDL) file for defining the format of the service's SOAP requests, and a folder of `.xsd` files that are used by the SFCC Service Framework to defining complex types that are referenced in the WSDL.

* The `vertex.http` service is a SOAP web service that makes tax calculation lookup calls to the Vertex tax calculation API.
    * The service metadata is included in the migrations for this integration and can be imported through BM site import/export, or using Pixel's dwre tools `migrate` cli command.

---
# Vertex Integration Cartridge Setup & Installation

In order to add this cartridge to a SFCC site there are several setup, coding, and configuration tasks that need to be addressed. The following section details what these steps are.

## Assumptions
For the purposes of this setup guide the instructions will assume the following:
* The base architecture for the site is the Storefront Reference Architecture (SFRA)
* The customer has a set-up instance of the Vertex O-Series tax calculation service and has provided a _trustedId_ & API endpoint information, as well as business requirements around what the tax setup should look like.

## Cartridge Installation
1. Upload the cartridge and add it to the cartridge path before the app_storefront_base cartridge.
2. Import the metadata from the SFCC Business Manager __Site Import/Export__ module. Once this cartridge has been placed in it's own repository, there will be an included metadata folder where the XML files for import can be found.
3. Crerate customer groups to drive customer tax classes, and assign Vertex custom attribute values to each (Optional).
    * In order to setup custom customer classes (and class Ids), you need to configure a customer group that will segment the appropriate customers via BM.
    * After you create a `CustomerGroup` and configure the rules, you need to add the tax class, and tax class ID to be used for customers in this group to the corresponding `CustomerGroup` custom system object attributes (`customerClassCodeID` & `customerClassCode`). These will be passed in the call in place of the default customer tax class values configured in the next step.
4. Assign the appropriate values to the SitePreference attributes.
    * Calls to the `vertex.http` service require the following site preference values to be configured (All of the preferences are held in a preference group name: Vertex General Configuration; ID: Vertex):
        - __vertexCompanyCode {string}:__ Provided by Vertex.
        - __vertexDistributionDefaultID {string}:__ The Id of the Store system object that is being used to hold the ship-from address for tax calculation purposes (Usually a distribution center).
        - __vertexCustomerClassCodeDefaultID {string}:__ The default customer tax class ID to be used if the user is not a member of one of the customer groups configured to map to customer tax classes.
        - __vertexCustomerClassCodeDefault {string}:__ The default customer tax class to be used if the user is not a member of one of the customer groups configured to map to customer tax classes.
        - __vertexCustomerClasses {Enum\<string>}:__ A list of CustomerGroups that have been assigned custom attribues to map to a tax class. If a customer is a member of one of the customer groups andd the CustomerGroup instance has the appropriate Vertex custom attribute values configured, the first CustomerGroup's ID that the customer is a member of, and is included in this list of strings, will be used to get a tax class, and tax class ID for the Vertex service call.
4. Setup the service with the appropriate credentials and endpoint.
    * In BM, set the endpoit configuration for the newely created service credentials (vertex.http.credentials) to the URL endpoint provided by Vertex.
    * Enter the Vertex trustedID (provided by Vertex) into the credentials object's 'password' field
5. Set product class values for any product's that should not use the default tax class of 'None'.
    * Set the custom attribute value (`productClassID`) for any products that need to be included in a separate tax class.
        * This can be included on a variation level, or on master products. If it is configured on a master product, and no value is set for the vairation, then it will inherit the value from the master product.
6. Set the Site Preference value in BM to enable Vertex.
    * Set the value for `SitePreference` custom attribute `vertexIsEnabled` to true/yes to enable use of the Vertex service for tax calculation.


---
# Cartridge Code Overview
The `int_vertex` cartridge contains several types of files that are needed in order to setup and make the calls to the service, and to override the default taxation hook in the SFRA app.

## Steps for overriding the SFRA tax calculation hooks (SFRA):
One of the best features of the SFRA that I have come accross to date is the ease with wich the tax calculation tables can be switched out for a web service call. This portion of the documentation details the steps that were taken to override the default hooks implementation for calculation of taxers in on an SFCC site.


### 1. Copy files from app_storefront_base and make changes:
Several files from the SFRA codebase need to be overriden in order to get the Vertex service integration to work through the hooks sytem like the current taxation hook:

#### `helpers/basketCalculationHelpers.js`
- The `calculateTotals()` & `calculateTaxes()` methods are both used to call the basket calculation hooks. These need to be overridden with the hooks from the `int_vertex` cartrdige by wrapping the hook call in a site-preference check, and then calling Vertex hook if the site preference `vertexIsEnabled` is found, and set to true.

#### `hooks/taxes.js`
- The calculateTaxes method is replaced to make a call to the Vertex web service to get the tax calculation data instead of using the default calculation tables. This version of the script is called by the vertex hook point `vertex.basket.taxes`.

#### `hooks/cart/calculate.js`
- Once the file is copied over, there is a known typo in the code base that needs to be fixed:
    - Bad Method Call: `lineItem.updateTaxAmoun(tax.value);`
    - Fixed: `lineItem.updateTaxAmount(tax.value);`

### 2.

## Steps to make a call to the service:
The service can be called from a hooks script file or anywhere in the SFCC site using the following setps:

1. First, import a reference to the VertexRequest and VertexService classes.

    ```JavaScript
    const VertexRequest = require('int_vertex/cartridge/models/vertexRequest');
    const VertexResponse = require('int_vertex/cartridge/models/vertexResponse');
    const VertexService = require('int_vertex/cartridge/scripts/services/vertexService');
    ```

2. Create an instance of the `VertexRequest` class, passing the line item container that you need to calculate taxes on to the constructor function, and an instance of the `VertexService` class who's constructor doesn't take any arguments.

    ```JavaScript
    const vertexService = new VertexService();
    const vertexRequest = new VertexRequest(basket);
    ```

3. Check that the `VertexRequest` instance that was returned is valid using the `.valid` property, and pass the returned `VertexRequest` instance's `.toXml()` result to the `VertexService` instance's `.calculateTax()` method.

    ```JavaScript
    let callResult;
    if (vertexRequest.valid) {
        callResult = vertexService.calculateTax(vertexRequest);
    }
    ```

4. Pass the return result from the call to the constructor function for the `VertexResponse` class to get an easy to work with response object.

    ```JavaScript
    const vertexResponse = new VertexResponse(callResult);
    ```
5. Get the formatted taxes Array from the `VertexResponse` class instance using the `.getTaxes()` instance method. The only parameter for the method call is the basket. This is used to map the tax line items back to their SFCC line items.

    ```JavaScript
    // Format of the taxes array to return from the calculate tax hook.
    const taxesArray = vertexResponse.getTaxes(basket);
    ```

---

## Service Class & Supporting Model Classes

To make a call to the tax calculation service there are 3 modules that are needed:
* __models/vertexRequest.js__ - Holds the VertexRequest class definition.
* __models/vertexResponse.js__ - Holds the VertexResponse class definition
* __services/vertexService.js__ - Holds the VertexService class definition.

The 2 model classes are used to provide a standard interface for passing data to and from the tax calculation api endpoint, and also provide null checking for the necessary fields when making service calls to the Vertex service.

The service module creates the service using the LocalServiceRegistry class, and defines the callbacks for the necessary service framework lifecycle methods.

The resulting SOAP class that is returned from the service call can be passed directly into the constructor for creating a VertexResponse class instance. The response is then parsed for the the necessary tax information which is mapped back to the line items, and returned in the expected format for updating the basket using the cart/calculate hook file.

The returned line items use the attribute LineItemId to reference the original lineItem. This is set as the UUID from the matching SFCC LineItem in the request. This is allows for returning the tax information in the same format that the default SFRA implementation uses with the tax calculation hook.

The service is a SOAP service and is implemented using the SFCC Service Frameworks generated class definitions for creating the XML request and parsing the XML response.