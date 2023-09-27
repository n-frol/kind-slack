/**
 * Generates custom feeds based on current settings.
 */
//standard API
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var File 			= require('dw/io/File');
var FileWriter 		= require('dw/io/FileWriter');
var Locale 			= require('dw/util/Locale');
var Reader 			= require('dw/io/Reader');
var Site 			= require('dw/system/Site');
var Status 			= require('dw/system/Status');
var StringUtils 	= require('dw/util/StringUtils');

//initialize logger
var cvLogger = require('dw/system/Logger').getLogger('CustomFeeds');

var CatalogExportMgr 		= require('int_customfeeds/cartridge/scripts/export/CatalogExportMgr');
var CSVExportHandler 		= require('int_customfeeds/cartridge/scripts/export/handlers/CSVExportHandler');
var TemplateExportHandler 	= require('int_customfeeds/cartridge/scripts/export/handlers/TemplateExportHandler');


/**
 * Triggers the custom feed generation
 * 
 * @param {dw.util.HashMap} args 
 * @returns {dw.system.Status}
 */
function generate(args)
{
	//initialize a fake logger component
	var loggingComponent = {
		addMessage: function(msg)
		{
			if (msg)
			{
				cvLogger.info(msg);
			}
		}
	}
	var exportMgr = new CatalogExportMgr(loggingComponent);
	registerConfigurableHandlers(exportMgr, loggingComponent);

	exportMgr.runExport();

	return new Status(Status.OK, 'OK');
}


/**
 * Helper function which handles the custom objects
 */
function registerConfigurableHandlers(exportMgr, cmp)
{
	for each(var co in CustomObjectMgr.getAllCustomObjects("CustomFeedConfig"))
	{
		var folder = new File(co.custom.folderName);
		if (!folder.exists() && !folder.mkdirs())
		{
			throw new Error("Could not create folder " + co.custom.folderName);
		}
		var fileName = co.custom.fileName.replace(/\{\{[^}]*\}\}/g,
			function(a: String)
			{
				var parts: Array = a.split(/(?:\{\{| |\}\})/g);
				var variable = parts[1];
				if (variable == "timestamp")
				{
					var format = 'yyyyMMddhhmmss';
					parts.forEach(function(part: String)
					{
						if (part.indexOf('format=') == 0)
						{
							format = part.substring(0, part.length -
								1).substring(8);
						}
					});
					return StringUtils.formatCalendar(Site.getCalendar(),
						format);
				}
				if (variable == "countrycode")
				{
					return Locale.getLocale(Site.getCurrent().defaultLocale)
						.country;
				}
				return "";
			});
		var file = new File(folder, fileName);
		var encoding = co.custom.fileEncoding || 'UTF-8';
		if (!file.exists() && !file.createNewFile())
		{
			throw new Error("Could not create export file");
		}

		if (cmp) cmp.addMessage('Registering Configurable Feed ' + co.custom
			.id, 'INFO');
		if (co.custom.type == "XML")
		{
			var fileWriter = new FileWriter(file, encoding);
			var templateExportHandler =  new TemplateExportHandler(fileWriter, co.custom
				.configuration);
			exportMgr.registerExportHandler(templateExportHandler);
		}
		else if (co.custom.type == "CSV")
		{
			var lines = new Reader(co.custom.configuration);
			var config = {
				separator: ','
			};
			var line;
			while ((line = lines.readLine()) != null)
			{
				if (line.indexOf('separator ') == 0)
				{
					config.separator = line.substring(10);
				}
				else if (!config.fields)
				{
					// use first line as fields
					config.fields = line.split(config.separator);
				}
				else if (!config.header)
				{
					// if there are more lines, we previously read the header
					config.header = config.fields;
					config.fields = line.split(config.separator);
				}
			}
			exportMgr.registerExportHandler(new CSVExportHandler(new FileWriter(
					file, encoding), config.separator, config.fields,
				config.header));
		}
	}
}

/*
 * Job exposed methods
 */
/** Triggers the generation of custom feeds.
 * @see module:export/jobsteps/CustomFeeds~generate */
exports.generate = generate;
