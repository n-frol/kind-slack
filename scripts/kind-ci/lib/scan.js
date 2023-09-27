var glob = require("glob");
var path = require('path');

// eslint-disable-next-line consistent-return
module.exports = () => {
    try {
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
        return cartridges;
    // eslint-disable-next-line no-empty
    } catch (error) {}
};
