/* eslint no-console: 0 */
var path = require('path');

const webpack = require("webpack");
const util = require("./util");
const fs = require('fs');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

var pkg = require(path.resolve(__dirname, '../package.json'));

var webpackConfigurations = util.processWebpackFiles({
    paths: pkg.paths,
    jsAliases: pkg.jsAliases,
    scssAliases: pkg.scssAliases,
    scssIncludePaths: pkg.scssIncludePaths,
    isProduction: true
});

let compiler = webpack(webpackConfigurations);

compiler.run((err, stats) => {
    console.log(stats.toString({
        chunks: false,
        colors: true
    }));
    if (stats.hasErrors()) {
        process.exit(1);
    }
});

// initialize task watchers
if (pkg.tasks) {
    pkg.tasks.forEach(task => {
        var taskScript = require(resolveApp(task.task));
        taskScript(undefined, task.src, task.args);
    });
}
