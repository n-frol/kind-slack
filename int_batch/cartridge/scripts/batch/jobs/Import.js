var File = require('dw/io/File');
var Logger = require('dw/system/Logger');
var Pipeline = require('dw/system/Pipeline');
var Status = require('dw/system/Status');

function byModificationAsc(lhs, rhs)
{
    return lhs.lastModified() - rhs.lastModified();
}

function byName(lhs, rhs)
{
    if (lhs.getName() < rhs.getName()) {
        return -1;
    } else if (lhs.getName() > rhs.getName()) {
        return 1;
    }
    return 0;
}

var ZIP_FILENAME = /\.zip$/;
var GZ_FILENAME = /\.gz$/;
/**
 * Validates and then (if valid) imports files
 */
function importFilesFromDir(schema, importPipeline, directory, prefix, mode, extra) {
    var i;
    var log = Logger.getLogger('int_batch');
    var dir = new File(File.IMPEX + '/src/' + directory);

    var orgPrefs = dw.system.System.getPreferences();
    var archiveInvalidFiles = orgPrefs.getCustom().batchArchiveInvalidFiles;
    var sortFilesLexigraphically = orgPrefs.getCustom().batchSortFilesLexigraphically;

    if (!dir.isDirectory()) {
        log.error('Path not found or is not a directory: ' + directory.fullPath);
        return new Status(Status.ERROR);
    }

    var filesInDir = dir.listFiles(function(f) {
        return f.getName().substr(0, prefix.length) === prefix;
    });

    // check for zip files
    try {
        for (i = 0; i < filesInDir.size(); i++) {
            var f = filesInDir[i];
            if (ZIP_FILENAME.test(f.name)) {
                f.unzip(dir);
                f.remove();
            } else if (GZ_FILENAME.test(f.name)) {
                f.gunzip(dir);
                f.remove();
            }
        }
    } catch (e) {
        log.error('Invalid GZIP/Zip file (possibly zero bytes?); Deleting');
        if (f && f.isFile()) {
            f.remove();
        }
        return new Status(Status.ERROR);
    }

    // check for files again after zip extraction
    filesInDir = dir.listFiles(function(f) {
        return f.getName().substr(0, prefix.length) === prefix;
    });

    if (empty(filesInDir) || filesInDir.size() === 0) {
        log.info('No files found for upload');
        return new Status(255, 'NO_FILES_FOUND');
    }

    if (sortFilesLexigraphically) {
        filesInDir.sort(byName);
    } else {
        filesInDir.sort(byModificationAsc);
    }

    var validationError = false;
    var archiveDir = new File(File.IMPEX + '/archive/');

    for (i = 0; i < filesInDir.size(); i++) {
        var file = filesInDir[i];
        var normalizedPath = directory + File.SEPARATOR + file.getName();

        if (!empty(schema)) {
            var validationResult = Pipeline.execute('BatchJobs-Validate', {
                File: normalizedPath,
                Schema: schema
            });
        }

        if (!empty(schema) && validationResult.Status.error) {
            validationError = true;
            log.error(validationResult.Status.message + ' (' + validationResult.File + ')');
            if (!empty(validationResult.LogFileName)) {
                log.error('See validation log file (first 10 lines follows): IMPEX/log/' + validationResult.LogFileName);

                var reader = new dw.io.FileReader(new File(File.IMPEX + '/log/' + validationResult.LogFileName));
                for (var j=0; j<10; j++) {
                    var line = reader.readLine();
                    if (line === null) {
                        break;
                    }
                    log.error(line);
                }
                reader.close();
            }

            if (archiveInvalidFiles === true) {
                if (!archiveDir.exists()) {
                    archiveDir.mkdir();
                }
                var archivedFile = new File(File.IMPEX + '/archive/INVALID_' + file.getName());
                file.renameTo(archivedFile);
                log.error('Archiving invalid file to: ' + archivedFile.fullPath);
            } else {
                return new Status(Status.ERROR, validationResult.code, validationResult.message);
            }
        } else {
            var params = {
                ImportFile: normalizedPath,
                ImportMode: mode
            };

            if (extra) {
                for (var p in extra) {
                    params[p] = extra[p];
                }
            }

            var importResult = Pipeline.execute(importPipeline, params);

            if (importResult.Status.error) {
                log.error(importResult.Status.message);
                if (!empty(importResult.LogFileName)) {
                    log.error('See import log file: IMPEX/log/' + importResult.LogFileName);
                }
                return new Status(Status.ERROR, importResult.code, importResult.message);
            }

            log.info('Successfully imported ' + file.fullPath);
            if (!archiveDir.exists()) {
                archiveDir.mkdir();
            }
            var archiveFile = new File(File.IMPEX + '/archive/' + file.getName());
            file.renameTo(archiveFile);
        }
    }

    if (validationError) {
        // indicate validation error (file was skipped)
        return new dw.system.Status(254, 'VALIDATION_ERROR');
    } else {
        return new Status(Status.OK);
    }
}

exports.importCatalog = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('catalog.xsd', 'BatchJobs-ImportCatalog', params.directory, params.prefix, mode);
};

exports.importInventoryLists = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('inventory.xsd', 'BatchJobs-ImportInventoryLists', params.directory, params.prefix, mode);
};

exports.importPriceBooks = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('pricebook.xsd', 'BatchJobs-ImportPriceBooks', params.directory, params.prefix, mode);
};

exports.importCustomObjects = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('customobject.xsd', 'BatchJobs-ImportCustomObjects', params.directory, params.prefix, mode);
};

exports.importGiftCertificates = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('giftcertificate.xsd', 'BatchJobs-ImportGiftCertificates', params.directory, params.prefix, mode);
};

exports.importContent = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('library.xsd', 'BatchJobs-ImportContent', params.directory, params.prefix, mode);
};

exports.importTax = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('tax.xsd', 'BatchJobs-ImportTax', params.directory, params.prefix, mode);
};

exports.importShipping = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('shipping.xsd', 'BatchJobs-ImportShipping', params.directory, params.prefix, mode);
};

exports.importCoupons = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('coupon.xsd', 'BatchJobs-ImportCoupons', params.directory, params.prefix, mode);
};

exports.importPromotions = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('promotion.xsd', 'BatchJobs-ImportPromotions', params.directory, params.prefix, mode);
};

exports.importCustomers = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('customer.xsd', 'BatchJobs-ImportCustomers', params.directory, params.prefix, mode);
};

exports.importSourceCodes = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('sourcecode.xsd', 'BatchJobs-ImportSourceCodes', params.directory, params.prefix, mode);
};

exports.importSlots = function(params) {
    var mode = params.importMode;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir('slot.xsd', 'BatchJobs-ImportSlots', params.directory, params.prefix, mode);
};

exports.importKeyValueMappings = function(params) {
    var mode = params.importMode;
    var mappingName = params.mappingName;
    if (empty(mode)) {
        mode = 'MERGE';
    }

    return importFilesFromDir(null, 'BatchJobs-ImportKeyValueMappings', params.directory, params.prefix, mode, {
        MappingName: mappingName
    });
};
