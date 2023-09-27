var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var CSVStreamReader = require('dw/io/CSVStreamReader');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');
/*eslint-disable */
function importAddress() {
    var filePath = 'src/CustomerAddress';
    var fileFullPath = File.IMPEX + File.SEPARATOR + filePath + File.SEPARATOR;
    var thisDirectory = new File(fileFullPath);
    var files = thisDirectory.listFiles();
    for (var i = 0; i < files.length; i++) {
        if (files[i].file) {
            var fileReader = new FileReader(files[i], 'UTF-8');
            var streamCSVReader = new CSVStreamReader(fileReader, ',');
            try {
                do {
                    var nextLine = streamCSVReader.readNext();
                    if (!empty(nextLine) && nextLine[0] !== 'customerID') {
                        var customer = CustomerMgr.getCustomerByCustomerNumber(nextLine[0]);
                        // check if address ID exists
                        if (empty(customer.addressBook.getAddress(nextLine[1]))) {
                            Transaction.wrap(function () {
                                var address = customer.addressBook.createAddress(nextLine[1]);
                                address.address1 = nextLine[2];
                                address.address2 = nextLine[3] ? nextLine[3] : '';
                                address.countryCode = nextLine[7].toUpperCase();
                                address.lastName = nextLine[8];
                            });
                        }
                    }
                } while (nextLine);
            } catch (e) {
                Logger.error('WhitelistStores file {0} is invalid. Error {1}', files[i].getFullPath(), e.message);
                streamCSVReader && streamCSVReader.close();
                fileReader && fileReader.close();
                return false;
            }
        }

        // move files to archive
        copyFile(files[i].name, 'CustomerAddress', 'Archieve');
    }
}

// move files to archive

function copyFile(fileName, type, targetFolder) {
    if (targetFolder == null || fileName == null) {
        Logger.debug('Input values are not set.');
        return;
    }

    // checks correctness of target path
    var targetDirectory = new File(File.IMPEX);
    var srcDirectory = new File(targetDirectory, 'src');
    srcDirectory = new File(srcDirectory, type);

    if (!srcDirectory.isDirectory())	{
        Logger.debug('Error by access of sourcet path \'' + type + '\' .');
        return;
    }

    targetDirectory = new File(targetDirectory, 'src');
    targetDirectory = new File(targetDirectory, type);
    targetDirectory = new File(targetDirectory, targetFolder);

    if (!targetDirectory.exists()) {
        if (!targetDirectory.mkdir()) {
            Logger.debug('Error by create ' + targetFolder + ' directory.');
            return;
        }
    }

    var srcFile = new File(srcDirectory, fileName);
    fileName = fileName.replace('.xml', '-0.zip');
    var targetFile = new File(targetDirectory, fileName);
    var i = 0;
    while (targetFile.exists()) {
        fileName = fileName.replace(/-\d*\.zip$/, '-' + (i + 1) + '.zip');
        Logger.debug(fileName);
        targetFile = new File(targetDirectory, fileName);
        // when there are already 1000 files the 1000 will be overwritten all the time
        if (i > 1000) {
            break;
        }
        i++;
    }

    srcFile.zip(targetFile);
    srcFile.remove();
}

module.exports = {
    execute: importAddress
};