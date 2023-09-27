var path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: {
        components: './accelerator/app_kind_components/cartridge/client/default/js/components.js',
    },
    output: {
        path: path.resolve('./app_kind_components/cartridge/static/default/js'),
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
        }
    }
}, {
    mode: 'none',
    name: 'scss',
    entry: {
        'components': './accelerator/app_kind_components/cartridge/client/default/scss/components.scss'
    },
    output: {
        path: path.resolve('./app_kind_components/cartridge/static/default/css')
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

