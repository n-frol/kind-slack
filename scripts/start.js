/* eslint no-console: 0 */

var path = require('path');

const fs = require('fs');
const webpack = require("webpack");
const util = require("./util");
const isInteractive = process.stdout.isTTY;
const chalk = require("chalk");
const SFCCUpload = require("./sfccupload");
var glob = require("glob");
const chokidar = require('chokidar');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

var pkg = require(path.resolve(__dirname, '../package.json'));

var webpackConfigurations = util.processWebpackFiles({
    paths: pkg.paths,
    jsAliases: pkg.jsAliases,
    scssAliases: pkg.scssAliases,
    scssIncludePaths: pkg.scssIncludePaths,
    isProduction: false
});

/**
 * Pass a "multi-config" (list of configs) to webpack to build each one
 */
let compiler = webpack(webpackConfigurations);
const formatMessages = require('react-dev-utils/formatWebpackMessages');

var invalidatedCompilers = 0;

compiler.hooks.invalid.tap('invalid', () => {
    console.log('Bundle Invalidated; recompiling...');
    invalidatedCompilers++;
});

var firstRun = true;

console.log('Scanning for cartridges...');

var projectFiles = glob.sync(".project", {
    matchBase: true,
    ignore: "node_modules"
});
var cartridges = projectFiles.map(f => {
    var dirname = path.dirname(f);
    var cartridge = path.basename(dirname);
    return {
        dest: cartridge,
        src: dirname
    };
});

console.log("Watching Cartridges...");
cartridges.forEach(c => console.log(`\t${c.dest}`));

// eslint-disable-next-line
SFCCUpload({
    paths: cartridges.map(c => {
        return { src: c.src + "/**", dest: c.dest };
    }),
    conditional: () => invalidatedCompilers === 0 && !firstRun,
    ignored: /(node_modules|client\/default)/
});

console.log('Building bundle(s), please wait...');

// initialize task watchers
if (pkg.tasks) {
    pkg.tasks.forEach(task => {
        var taskScript = require(resolveApp(task.task));
        if (task.src) {
            chokidar.watch([task.src], {
                ignored: /(^|[/\\])\../,
                ignoreInitial: true,
                cwd: appDirectory
            }).on('all', (event, p) => {
                taskScript(p, task.src, task.args);
            });
        }

        taskScript(null, task.src, task.args);
    });
}
var allStats = [];
var allErrors = [];
var allWarnings = [];
compiler.watch({
    aggregateTimeout: 150,
    ignored: /node_modules/
}, (err, stats) => {
    const messages = formatMessages(stats.toJson({}, true));
    const isSuccessful = !messages.errors.length;

    if (isInteractive && !firstRun) {
        util.clearConsole();
    }

    // TODO output on final and clear console
    invalidatedCompilers = invalidatedCompilers ? --invalidatedCompilers : 0;

    if (firstRun && !isSuccessful) {
        // exit if we cannot start builds and output all errors
        console.log(chalk.red('Failed to compile.\n'));
        console.log(messages.errors.join('\n\n'));
        process.exit(1);
        return;
    }
    firstRun = false;

    allStats.push(stats);
    allErrors = allErrors.concat(messages.errors);
    allWarnings = allWarnings.concat(messages.warnings);

    if (invalidatedCompilers > 0) {
        // wait for all compilers to finish
        return;
    }

    allStats.forEach(s => {
        util.summarizeMultiCompilerStats(s);
    });
    allStats = [];

    if (allErrors.length) {
        // Only keep the first error for interactive rebuilds
        if (allErrors.length > 1) {
            allErrors.length = 1;
        }
        console.log(chalk.red('Failed to compile.\n'));
        console.log(allErrors.join('\n\n'));
        allErrors = [];
        return;
    }

    if (allWarnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'));
        console.log(allWarnings.join('\n\n'));

        // Teach some ESLint tricks.
        console.log(
            '\nSearch for the ' +
            chalk.underline(chalk.yellow('keywords')) +
            ' to learn more about each warning.'
        );
        console.log(
            'To ignore, add ' +
            chalk.cyan('// eslint-disable-next-line') +
            ' to the line before.\n'
        );
    }

    allErrors = [];
    allWarnings = [];
});
