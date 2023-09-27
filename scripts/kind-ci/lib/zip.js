const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('zip');
const archiver = require('archiver');

module.exports = (src, dest) => {
    // eslint-disable-next-line no-undef
    return new Promise(resolve => {
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        const file = path.resolve(process.cwd(), dest, 'archive.zip');
        const output = fs.createWriteStream(file);
        const appDirectory = fs.realpathSync(process.cwd());
        const resolveApp = relativePath => path.resolve(appDirectory, relativePath);


        src.forEach(f => debug(`Zipping ${f.src} to ${f.dest}`));

        output.on('close', () => {
            resolve(file);
        });

        archive.on('error', error => {
            throw error;
        });

        archive.pipe(output);
        src.forEach(f => archive.directory(resolveApp(f.src), f.dest));

        archive.finalize();
    });
};
