#!/usr/bin/env node

'use strict';

const debug = require('debug')('cli');
const path = require('path');
const yargs = require('yargs');
const chalk = require('chalk');
const config = require('./config');

const argv = yargs
  .usage('Usage: $0 <command> <instance> [options] --switches')
  .command(
    'activate [code-version]',
    'Activate code version on an instance'
  )
  .command(
    'push [code-version]',
    'Push code version to an instance',
    {
        zip: {
            alias: 'options.zip',
            describe: 'Upload as a zip',
            default: true
        }
    }
  )
  .command(
    'remove <instance> [code-version]',
    'Remove code version from an instance'
  )
  .command('job <instance> <job-id>', 'Run a job on an instance')
  .command('clean <instance>', 'Remove inactive code versions on instance')
  .command(
    'keygen <user> <crt> <key> <srl>',
    'Generate a staging certificate for a stage instance user account'
  )
  .option('username', { alias: 'u', describe: 'Username for instance' })
  .option('password', { alias: 'p', describe: 'Password for instance' })
  .option('hostname', { alias: 'h', describe: 'Hostname for instance' })
  .option('api-version', { alias: 'v', describe: 'Demandware API Version' })
  .option('client-id', { alias: 'e', describe: 'Demandware API Client ID' })
  .option('client-password', { alias: 't', describe: 'Demandware API Client Password' })
  .option('key', { alias: 'k', describe: 'Staging Deployment Cert key' })
  .option('ca', { alias: 'b', describe: 'Staging Deployment Cert' })
  .option('cert', {alias: 'c', describe: 'Staging Deployment Cert' })
  .option('webdav', { describe: 'Staging Deployment Webdav' })
  .demand(1)
  .help()
  .version().argv;

const command = argv._[0];

try {
    debug(`Executing ${command}`);

    const configured = config(argv);
    require(path.join(__dirname, `../commands/${command}.js`))(configured);
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        // eslint-disable-next-line no-console
        console.log(err.message);
        // eslint-disable-next-line no-console
        console.log(chalk.red(`\nThe command '${command}' is not valid.\n`));
        // eslint-disable-next-line no-console
        console.log(`Use '${argv.$0} help' for a list of commands.\n`);
    } else {
      process.exit(1);
    }
}
