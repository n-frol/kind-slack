/* eslint no-console: 0 */
/**
 * Generate an SVG symbol file (sprite) from a
 * glob of svg files.
 */

var fs = require('fs');
var SVGSpriter = require('svg-sprite');
var glob = require('glob');
var path = require('path');
var mkdirp = require('mkdirp');
var File = require('vinyl');
var chalk = require('chalk');

var config = {
    mode: {
        symbol: {
            dest: '',
            sprite: ''
        }
    },
    shape: {
        id: {
            generator: "svg-%s"
        }
    }
};


module.exports = function (changedPath, src, args) {
    // ignore path changed and just build the entire sprite
    config.mode.symbol.dest = path.dirname(args.dest);
    config.mode.symbol.sprite = path.basename(args.dest);
    var spriter = new SVGSpriter(config);

    var files = glob.sync(src);
    var cwd = fs.realpathSync(process.cwd());

    if (files) {
        console.log('Building SVGs from ' + src);
        files.forEach(f => {
            spriter.add(
                new File({
                    path: path.join(cwd, f),
                    base: path.join(cwd, f.substring(0, f.length - path.basename(f).length)),
                    contents: fs.readFileSync(f)
                })
            );
        });

        spriter.compile(function (error, result) {
            var symbol = result.symbol;
            // eslint-disable-next-line
            for (var resource in symbol) {
                mkdirp.sync(path.dirname(symbol[resource].path));
                fs.writeFileSync(symbol[resource].path, symbol[resource].contents);
                console.log(chalk.green('Wrote ' + symbol[resource].path));
            }
        });
    }
};
