/* global describe, it */
'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');

var ArrayList = require('../../../../mocks/dw.util.Collection');

var mockOptions = [{
    optionId: 'option 1',
    selectedValueId: '123'
}];

var availabilityModelMock = [
    {
        inventoryRecord: {
            ATS: {
                perpetual: false,
                value: 3
            }
        }
    },
    {
        inventoryRecord: {
            perpetual: true,
            ATS: {
                value: 0
            }
        }
    },
    {
        inventoryRecord: {
            perpetual: false,
            ATS: {
                value: 0
            }
        }
    }
];

var productLineItemsMock = {
    someProductID: {
        productID: 'someProductID',
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        product: {
            availabilityModel: availabilityModelMock[0]
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        availabilityModelInd: 0
    },
    someBundleProductID: {
        productID: 'someBundleProductID',
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        product: {
            availabilityModel: availabilityModelMock[0]
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        availabilityModelInd: 0
    },
    somePerpetualBundleProductID: {
        productID: 'somePerpetualBundleProductID',
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        product: {
            availabilityModel: availabilityModelMock[1]
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        availabilityModelInd: 0
    },
    someOOSBundleProductID: {
        productID: 'someOOSBundleProductID',
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        product: {
            availabilityModel: availabilityModelMock[2]
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        availabilityModelInd: 0
    }
};

var stubGetBonusLineItems = function () {
    var bonusProducts = [{
        ID: 'pid_1'
    },
    {
        ID: 'pid_2'
    }];
    var index2 = 0;
    var bonusDiscountLineItems = [
        {
            name: 'name1',
            ID: 'ID1',
            description: 'description 1',
            UUID: 'uuid_string',
            maxBonusItems: 1,
            bonusProducts: {
                iterator: function () {
                    return {
                        items: bonusProducts,
                        hasNext: function () {
                            return index2 < bonusProducts.length;
                        },
                        next: function () {
                            return bonusProducts[index2++];
                        }
                    };
                }
            }
        }
    ];
    var index = 0;

    return {
        id: 2,
        name: '',
        iterator: function () {
            return {
                items: bonusDiscountLineItems,
                hasNext: function () {
                    return index < bonusDiscountLineItems.length;
                },
                next: function () {
                    return bonusDiscountLineItems[index++];
                }
            };
        }
    };
};

var createApiBasket = function (productInBasket) {
    var currentBasket = {
        defaultShipment: {},
        createProductLineItem: function () {
            return {
                setQuantityValue: function () {
                    return;
                }
            };
        },
        getBonusDiscountLineItems: stubGetBonusLineItems
    };
    if (productInBasket) {
        currentBasket.productLineItems = new ArrayList([productLineItemsMock]);
    } else {
        currentBasket.productLineItems = new ArrayList([]);
    }

    return currentBasket;
};

describe('cartHelpers', function () {
    var findStub = sinon.stub();
    findStub.withArgs([productLineItemsMock]).returns(productLineItemsMock);

    var cartHelpers = proxyquire('../../../../cartridges/int_sfra_bugfixes/cartridge/scripts/cart/cartHelpers.js', {
        'dw/catalog/ProductMgr': {
            getProduct: function (pid) {
                var mockLineItem = productLineItemsMock[pid];
                var mockLineItemProduct = mockLineItem.product;

                return {
                    optionModel: {
                        getOption: function () {},
                        getOptionValue: function () {},
                        setSelectedOptionValue: function () {}
                    },
                    availabilityModel: mockLineItemProduct.availabilityModel
                };
            }
        },
        'app_storefront_base/cartridges/app_storefront_base/cartridge/scripts/cart/cartHelpers': require('../../../../mocks/baseCartHelpers'),
        '*/cartridge/scripts/util/array': { find: findStub },
        'dw/web/Resource': {
            msg: function () {
                return 'someString';
            },
            msgf: function () {
                return 'someString';
            }
        },
        '*/cartridge/scripts/helpers/productHelpers': {
            getOptions: function () {},
            getCurrentOptionModel: function () {}
        },
        'dw/web/URLUtils': {
            url: function () {
                return {
                    toString: function () {
                        return 'string URL';
                    }
                };
            }
        }
    });

    it('should add a product to the cart', function () {
        var currentBasket = createApiBasket(false);
        var spy = sinon.spy(currentBasket, 'createProductLineItem');
        spy.withArgs(1);

        cartHelpers.addProductToCart(currentBasket, 'someProductID', 1, [], mockOptions);
        assert.isTrue(spy.calledOnce);
        currentBasket.createProductLineItem.restore();
    });

    it('should add a bundle product with allocation to the cart', function () {
        var currentBasket = createApiBasket(false);
        var spy = sinon.spy(currentBasket, 'createProductLineItem');
        spy.withArgs(1);

        cartHelpers.addProductToCart(currentBasket, 'someBundleProductID', 1, [], mockOptions);
        assert.isTrue(spy.calledOnce);
        currentBasket.createProductLineItem.restore();
    });
    it('should add a perpetual bundle product to the cart', function () {
        var currentBasket = createApiBasket(false);
        var spy = sinon.spy(currentBasket, 'createProductLineItem');
        spy.withArgs(1);

        cartHelpers.addProductToCart(currentBasket, 'somePerpetualBundleProductID', 1, [], mockOptions);
        assert.isTrue(spy.calledOnce);
        currentBasket.createProductLineItem.restore();
    });
    it('should not add an out of stock bundle product to the cart', function () {
        var currentBasket = createApiBasket(false);
        var spy = sinon.spy(currentBasket, 'createProductLineItem');
        spy.withArgs(1);

        cartHelpers.addProductToCart(currentBasket, 'someOOSBundleProductID', 1, [], mockOptions);
        assert.isFalse(spy.calledOnce);
        currentBasket.createProductLineItem.restore();
    });
});
