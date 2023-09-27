const fs = require('fs-extra');
const ora = require('ora');
const get = require('lodash/get');
const chalk = require('chalk');
const zip = require('../lib/zip');
const scan = require('../lib/scan');
const write = require('../lib/write');
const mkdir = require('../lib/mkdir');
const del = require('../lib/delete');
const log = require('../lib/log');
const unzip = require('../lib/unzip');

// eslint-disable-next-line consistent-return
module.exports = async options => {
    const {codeVersion, webdav, request} = options;

    log.info(`Pushing ${codeVersion} to ${webdav}`);
    const spinner = ora();
    const dest = `/Cartridges/${codeVersion}`;

    try {
        let file;
        if (options.zip) {
            
            spinner.start();
            spinner.text = `Scanning for cartridges`;
            var cartridges = await scan();
            spinner.succeed();

            spinner.start();
            spinner.text = `Zipping cartridges`;
            file = await zip(cartridges, get(process, 'env.TMPDIR', '.'));
            spinner.succeed();

            spinner.start();
            spinner.text = `Creating remote folder ${dest}`;
            await mkdir(dest, request);
            spinner.succeed();

            
            spinner.start();
            spinner.text = `Uploading ${dest}/archive.zip`;
            file = await write(
                file,
                dest,
                Object.assign({}, request, {
                onProgress({percent, size, uploaded}) {
                    const sizeInMegabytes = (size / 1000000.0).toFixed(2);
                    const uploadedInMegabytes = (uploaded / 1000000.0).toFixed(2);
                    const prettyPercent = chalk.yellow.bold(`${percent}%`);
                    const prettySize = chalk.cyan.bold(`${sizeInMegabytes}MB`);
                    const prettyUploaded = chalk.cyan.bold(`${uploadedInMegabytes}MB`);
                    spinner.text = `Uploading ${dest}/archive.zip - ${prettyUploaded} / ${prettySize} - ${prettyPercent}`;
                }
                })
            );
            spinner.succeed();

            spinner.start();
            spinner.text = `Unzipping ${file}`;
            await unzip(file, request);
            spinner.succeed();


            spinner.start();
            spinner.text = `Removing ${file}`;
            await del(file, request);
            spinner.succeed();
            log.success('Success');
        } else {

        }

    } catch (error) {
        spinner.fail();
        log.error(error);
    }
  
  };
  