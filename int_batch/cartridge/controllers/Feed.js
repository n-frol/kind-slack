/* global response */
'use strict';

/**
 * Feed.js
 *
 * Controller for exposing the results of feed jobs to third parties.
 */

var server = require('server');

server.get('Facebook', server.middleware.https, function (req, res, next) {
    var CSVStreamReader = require('dw/io/CSVStreamReader');
    var FileReader = require('dw/io/FileReader');


    var File = require('dw/io/File');
    var filePath = File.IMPEX +
        File.SEPARATOR + 'facebook' +
        File.SEPARATOR + 'fbFeed.csv';
    var file = new File(filePath);

    if (file.exists()) {
        response.setBuffered(false);
        response.setContentType('text/csv');
        var fileReader = new FileReader(file);
        var csvReader = new CSVStreamReader(fileReader);
        var resWriter = response.getWriter();

        // Read the 1st line of the file.
        var line = csvReader.readNext();

        while (line !== null) {
            resWriter.println(line.map(
                function (lnString) {
                    return lnString.indexOf(',') > -1 ? '"' + lnString + '"':
                        lnString;
                }
            ).join(','));
            line = csvReader.readNext();
        }

        // Close resources.
        fileReader.close();
        csvReader.close();
        resWriter.flush();
        resWriter.close();
    }
});

module.exports = server.exports();
