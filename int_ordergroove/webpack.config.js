var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: {
    	checkout: './int_ordergroove/cartridge/client/default/js/checkout.js',
    	main: './int_ordergroove/cartridge/client/default/js/main.js',
        productDetail: './int_ordergroove/cartridge/client/default/js/productDetail.js',
        search: './int_ordergroove/cartridge/client/default/js/search.js'
    },
    output: {
        path: path.resolve('./cartridge/static/default/js'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                enforce: "pre",
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "eslint-loader",
            },
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/env'],
                        plugins: ['@babel/plugin-proposal-object-rest-spread'],
                        cacheDirectory: true
                    }
                }
            }
        ]
    },
    resolve: {
        alias: {
            './address': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/address'),
            './formErrors': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/formErrors'),
            './billing': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/billing'),
            './shipping': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/shipping'),
            './summary': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/summary')
        }
    }
}];

