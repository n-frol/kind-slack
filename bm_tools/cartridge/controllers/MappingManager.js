'use strict';

/**
 * Controller that provides ways to manage key/value maps 
 * @module controllers/MappingManager
 */

/* SFCC API */
var ArrayList = require('dw/util/ArrayList');
var Calendar = require('dw/util/Calendar');
var CSVStreamWriter = require('dw/io/CSVStreamWriter');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var Logger = require('dw/system/Logger');
var MappingMgr = require('dw/util/MappingMgr');
var Pipeline = require('dw/system/Pipeline');
var StringUtils = require('dw/util/StringUtils');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/* Constants */
var WORKING_FOLDER = [File.IMPEX, 'src', 'toolbox', 'mappingmgr'].join(File.SEPARATOR);
var workingFolder = new File(WORKING_FOLDER);
if (!workingFolder.exists()) {
    workingFolder.mkdirs();
}

/**
 * Shows the mapping manager main panel.
 */
function show() {
    displayPanel();
}

/**
 * Displays the panel.
 * 
 * @returns
 */
function displayPanel(pdict) {
    var pdict = pdict || {};
    pdict.MappingInfos = getMappingInfos();
    pdict.FileList = getFileList();
    pdict.CSVFileList = getFileList(true);
    app.getView(pdict).render('toolbox/mapmanager/mainpanel');
}

/**
 * Gets file informations.
 * @returns
 */
function getFileList(filtered) {
    var fileList = new ArrayList();
    var regExp = new RegExp(/.*\.csv$/i);
    fileList.addAll(workingFolder.listFiles(function (file) {
        if (!empty(file)) {
            if (filtered) {
                return (!file.directory && regExp.test(file.name));
            }
            return (!file.directory);
        }
        return false;
    }));
    return fileList;
}

/**
 * Starts a terminal session and renders the terminal UI.
 */
function importFile() {
    var pdict = {};

    var messages = [];

    var parameterMap = request.httpParameterMap;
    var keyCount = parameterMap.keyCount.doubleValue || 1;
    var fileName = parameterMap.fileName.stringValue;
    var importMode = parameterMap.importMode.stringValue;
    var mappingName = parameterMap.mappingName.stringValue;
    if (!mappingName) {
        messages.push('Mapping name not provided!');
    } else if (!fileName) {
        messages.push('No file defined!');
    } else if (!importMode) {
        messages.push('No importMode defined!');
    } else {
        var file = new File(workingFolder, fileName);
        if (!file.exists()) {
            messages.push('File ' + file.fullPath + ' doesn\'t exist!');
        } else if (file.directory) {
            messages.push('File ' + file.fullPath + ' is a directory!');
        } else {
            var inboundPdict = {};
            inboundPdict.ImportFile = file.fullPath.replace('/IMPEX/src/', '');
            inboundPdict.ImportMode = importMode;
            inboundPdict.KeyCount = keyCount;
            inboundPdict.MappingName = mappingName;
            var outboundPdict = Pipeline.execute('MappingManager-ImportMapping', inboundPdict);
            if (!outboundPdict.Status) {
                messages.push('Unknow exception!');
            } else if (outboundPdict.Status.error) {
                messages.push('Import failed: ' + outboundPdict.Status.message);
            } else {
                messages.push('Import successfully completed!');
            }
        }
    }

    var pdict = { messages: messages };
    displayPanel(pdict);
}

/**
 * Starts a terminal session and renders the terminal UI.
 */
function exportMapping() {
    var pdict = {};
    var messages = [];
    var parameterMap = request.httpParameterMap;
    var mappingName = parameterMap.mappingName.stringValue;
    if (!mappingName) {
        messages.push('Mapping name not provided!');
    } else {
        var mappingNamesIterator = MappingMgr.getMappingNames().iterator();
        var mappingFound = false;
        while (mappingNamesIterator.hasNext()) {
            var tMappingName = mappingNamesIterator.next();
            if (tMappingName === mappingName) {
                mappingFound = true;
                break;
            }
        }
        if (!mappingFound) {
            messages.push('Mapping not available!');
        } else {
            var fileName = [mappingName, '_', StringUtils.formatCalendar(new Calendar(), "yyyyMMddHHmmss"), '.csv'].join('');
            var file = new File(workingFolder, fileName);
            var fw = new FileWriter(file);
            var csw = new CSVStreamWriter(fw);
            try {
                var mappingKeys = MappingMgr.keyIterator(mappingName);
                var headers = [];
                var line = [];
                while (mappingKeys.hasNext()) {
                    var mapKey = mappingKeys.next();
                    var valueMap = MappingMgr.get(mappingName, mapKey);
                    var line = [];
                    //adding header info if not yet done
                    keyCount = mapKey.keyComponents.length;
                    for (var i = 0; i < keyCount; i++) {
                        if (headers != null) {
                            headers.push('key_' + i.toFixed());
                        }
                        line.push(mapKey.keyComponents[i]);
                    }
                    var keySet = valueMap.keySet().iterator();
                    while (keySet.hasNext()) {
                        var key = keySet.next();
                        if (headers != null) {
                            headers.push(key);
                        }
                        line.push(valueMap.get(key));
                    }
                    if (headers != null) {
                        csw.writeNext(headers);
                        headers = null;
                    }
                    csw.writeNext(line);
                }
            } catch (error) {
                messages.push('Error writing target file: ' + error);
            } finally {
                csw.close();
                fw.close();
            }
        }
    }

    var pdict = { messages: messages };
    displayPanel(pdict);
}

/**
 * Starts a terminal session and renders the terminal UI.
 */
function upload() {
    var pdict = {};

    var messages = [];

    var parameterMap = request.httpParameterMap;
    var fileMap = parameterMap.processMultipart(function (field, contentType, fileName) {
        if (fileName == null || fileName == "") {
            return null;
        }
        return new File([File.TEMP, '/', fileName].join(''));
    });

    //nothing to do
    if (fileMap.size() < 1) {
        messages.push('No import file provided!');
    } else {
        //rename files
        var files = fileMap.values().iterator();
        while (files.hasNext()) {
            var file = files.next();
            var newFile = new File(workingFolder, file.name);
            file.renameTo(newFile);
            if (newFile.name.match(/.*\.zip$/i)) {
                newFile.unzip(workingFolder);
            }
        }
    }
    show(pdict);
}

/**
 * Starts a terminal session and renders the terminal UI.
 */
function deleteFile() {
    var pdict = {};
    var messages = [];
    var parameterMap = request.httpParameterMap;
    var fileName = parameterMap.fileName.stringValue;
    if (fileName) {
        var file = new File(workingFolder, fileName);
        if (file.exists() && !file.directory) {
            file.remove();
        }
    }
    displayPanel(pdict);
}

/**
 * Get the list of available maps
 */
function getMappingInfos(verbose) {
    var resultList = [];
    var mappingNamesIterator = MappingMgr.getMappingNames().iterator();
    while (mappingNamesIterator.hasNext()) {
        var mappingName = mappingNamesIterator.next();
        var mappingKeys = MappingMgr.keyIterator(mappingName);
        var mapSize = 0;
        var keyCount = 0;
        var headers = null;
        while (mappingKeys.hasNext()) {
            var mapKey = mappingKeys.next();
            //adding key component size
            keyCount = mapKey.keyComponents.length;
            for (var i = 0; i < keyCount; i++) {
                mapSize += mapKey.keyComponents[i].length;
            }
            var valueMap = MappingMgr.get(mappingName, mapKey);
            var keySet = valueMap.keySet().iterator();
            var tHeaders = [];
            while (keySet.hasNext()) {
                var key = keySet.next();
                if (!headers) {
                    tHeaders.push(key);
                }
                var value = valueMap.get(key);
                mapSize += value.length;
            }
            if (!headers) {
                headers = tHeaders;
            }
            if (!verbose) {
                break;
            }
        }
        var mappingInfo = {
            name: mappingName,
            keyCount: keyCount,
            count: mappingKeys.getCount(),
            headers: headers,
            size: mapSize
        }
        mappingKeys.close();
        resultList.push(mappingInfo);
    }
    return resultList;
}

/** Shows the main panel
 * @see {@link module:controllers/MappingManager~show} */
exports.Show = guard.ensure(['https', 'get'], show);

/** Imports the uploaded file
 * @see {@link module:controllers/MappingManager~importFile} */
exports.Import = guard.ensure(['https', 'post'], importFile);

/** Exports the uploaded file
 * @see {@link module:controllers/MappingManager~exportMapping} */
exports.Export = guard.ensure(['https', 'post'], exportMapping);

/** Uploads a file
 * @see {@link module:controllers/MappingManager~upload} */
exports.Upload = guard.ensure(['https', 'post'], upload);

/** Deletes a file
 * @see {@link module:controllers/MappingManager~upload} */
exports.Delete = guard.ensure(['https', 'post'], deleteFile);
