/* eslint no-console: 0 */
var path = require('path');
const SfccFileUpload = require("./integration/fileupload");
var glob = require("glob");

const fs = require('fs');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

var pkg = require(path.resolve(__dirname, '../package.json'));

var invalidatedCompilers = 0;

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

console.log("Deploying Cartridges...");
cartridges.forEach(c => console.log(`\t${c.dest}`));

// eslint-disable-next-line
SfccFileUpload({
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
        taskScript(undefined, task.src, task.args);
    });
}
