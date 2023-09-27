var path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: {
        addressBook: './storefront-reference-architecture/cartridges/app_storefront_base/cartridge/client/default/js/addressBook.js',
        base: './app_kind_snacks/cartridge/client/default/js/baseLoader.js',
        cart: './app_kind_snacks/cartridge/client/default/js/cart.js',
        checkout: './app_kind_snacks/cartridge/client/default/js/checkout.js',
        checkoutLogin: './app_kind_snacks/cartridge/client/default/js/checkoutLogin.js',
        checkoutRegistration: './app_kind_snacks/cartridge/client/default/js/checkoutRegistration.js',
        contact: './app_kind_snacks/cartridge/client/default/js/contact.js',
        login: './app_kind_snacks/cartridge/client/default/js/login.js',
        main: './app_kind_snacks/cartridge/client/default/js/main.js',
        orderHistory: './app_kind_snacks/cartridge/client/default/js/orderHistory.js',
        paymentInstruments: './app_kind_snacks/cartridge/client/default/js/paymentInstruments.js',
        productDetail: './app_kind_snacks/cartridge/client/default/js/productDetail.js',
        productTile: './app_kind_snacks/cartridge/client/default/js/productTile.js',
        int_kount_sfra: './int_kount_sfra/cartridge/client/default/js/checkout.js',
        dataTables: './app_kind_snacks/cartridge/client/default/js/dataTables.js',
        easyorder: './app_kind_snacks/cartridge/client/default/js/easyorder.js',
        profile: './app_kind_snacks/cartridge/client/default/js/profile.js',
        search: './app_kind_snacks/cartridge/client/default/js/search.js',
        int_changeup: './int_changeup_sfra/cartridge/client/default/js/changeUp.js',
        storeLocator: './storefront-reference-architecture/cartridges/app_storefront_base/cartridge/client/default/js/storeLocator.js',
        util: './storefront-reference-architecture/cartridges/app_storefront_base/cartridge/client/default/js/util.js'
    },
    output: {
        path: path.resolve('./app_kind_snacks/cartridge/static/default/js'),
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
            './address': path.resolve('./app_kind_snacks/cartridge/client/default/js/checkout/address'),
            './formErrors': path.resolve('./app_kind_snacks/cartridge/client/default/js/checkout/formErrors'),
            './billing': path.resolve('./app_kind_snacks/cartridge/client/default/js/checkout/billing'),
            './shipping': path.resolve('./app_kind_snacks/cartridge/client/default/js/checkout/shipping'),
            './summary': path.resolve('./app_kind_snacks/cartridge/client/default/js/checkout/summary'),
        }
    }
}, {
    mode: 'none',
    name: 'scss',
    entry: {
        'app': './app_kind_snacks/cartridge/client/default/scss/app.scss',
        'checkout/checkout': './app_kind_snacks/cartridge/client/default/scss/sfra/checkout/checkout.scss',
        'product/detail': './app_kind_snacks/cartridge/client/default/scss/sfra/product/detail.scss',
        'login': './app_kind_snacks/cartridge/client/default/scss/sfra/login.scss',
        'account/orderTrack': './app_kind_snacks/cartridge/client/default/scss/sfra/account/orderTrack.scss',
        'account/profile': './app_kind_snacks/cartridge/client/default/scss/sfra/account/profile.scss',
        'cart': './app_kind_snacks/cartridge/client/default/scss/sfra/cart.scss',
        'search': './app_kind_snacks/cartridge/client/default/scss/sfra/search.scss',
        'powerreviews': './app_kind_snacks/cartridge/client/default/scss/powerreviews.scss'
    },
    output: {
        path: path.resolve('./app_kind_snacks_new/cartridge/static/default/css')
    },
    module: {
        rules: [{
            test: /\.scss$/,
            use: [{
                loader: MiniCssExtractPlugin.loader,
            }, {
                loader: 'css-loader',
                options: {
                    url: false,
                    minimize: true
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    plugins: [
                        require('autoprefixer')()
                    ]
                }
            }, {
                loader: 'sass-loader'
            }
            ]
        }]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css'
        })
    ]
},
    {
        mode: 'none',
        name: 'scss',
        entry: {
            'app': './app_kind_snacks/cartridge/client/default/scss/app.scss',
            'checkout/checkout': './app_kind_snacks/cartridge/client/default/scss/sfra/checkout/checkout.scss',
            'product/detail': './app_kind_snacks/cartridge/client/default/scss/sfra/product/detail.scss',
            'login': './app_kind_snacks/cartridge/client/default/scss/sfra/login.scss',
            'account/orderTrack': './app_kind_snacks/cartridge/client/default/scss/sfra/account/orderTrack.scss',
            'account/profile': './app_kind_snacks/cartridge/client/default/scss/sfra/account/profile.scss',
            'cart': './app_kind_snacks/cartridge/client/default/scss/sfra/cart.scss',
            'search': './app_kind_snacks/cartridge/client/default/scss/sfra/search.scss',
            'powerreviews': './app_kind_snacks/cartridge/client/default/scss/powerreviews.scss'
        },
        output: {
            path: path.resolve('./app_kind_snacks_new/cartridge/static/default/css')
        },
        module: {
            rules: [{
                test: /\.scss$/,
                use: [{
                    loader: MiniCssExtractPlugin.loader,
                }, {
                    loader: 'css-loader',
                    options: {
                        url: false,
                        minimize: true
                    }
                }, {
                    loader: 'postcss-loader',
                    options: {
                        plugins: [
                            require('autoprefixer')()
                        ]
                    }
                }, {
                    loader: 'sass-loader'
                }
                ]
            }]
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[id].css'
            })
        ]
    }];
