const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = [{
    mode: 'development',
    name: 'js',
    entry: {
    	main: './int_gtm/cartridge/client/default/js/main.js',
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
            loginRadius: path.resolve(__dirname, 'int_loginradius/cartridge/client/default/js/loginRadius'),
            jquery: path.resolve(__dirname, '../node_modules/jquery'),
            './address': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/address'),
            './formErrors': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/formErrors'),
            './billing': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/billing'),
            './shipping': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/shipping'),
            './summary': path.resolve('../app_kind_snacks/cartridge/client/default/js/checkout/summary'),
        }
    },
}];

