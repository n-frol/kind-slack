var path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: {
    },
    output: {
        path: path.resolve('./app_kind_snacks_new/cartridge/static/default/js'),
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

        }
    }
}, {
    mode: 'none',
    name: 'scss',
    entry: {
        'main': './app_kind_snacks_new/cartridge/client/default/scss/main.scss'
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
