/**
* Directory Analyzer
*/

var Money 			: dw.value.Money 		= require('dw/value/Money');
var StringWriter 	: dw.io.StringWriter 	= require('dw/io/StringWriter');
var LinkedHashMap	: dw.util.LinkedHashMap = require('dw/util/LinkedHashMap');

var Class = require("bc_library/cartridge/scripts/object-handling/libInheritance").Class;

var counterTotalSizeFileType : String		= "counterTotalSizeFileType";
var counter1KB : String 					= "counter1KB";
var counter10KB : String 					= "counter10KB";
var counter100KB : String 					= "counter100KB";
var counter1MB : String 					= "counter1MB";
var counter10MB : String 					= "counter10MB";
var counter100MB : String 					= "counter100MB";
var counter1000MB : String 					= "counter1000MB";
var counterAll : String 					= "counterAll";
var counterPercent : String 				= "counterPercent";

var SIZE_1KB : Number = 1024;
var SIZE_10KB : Number = 1024*10;
var SIZE_100KB : Number = 1024*100;
var SIZE_1MB : Number = 1024*1024;
var SIZE_10MB : Number = 1024*1024*10;
var SIZE_100MB : Number = 1024*1024*100;


function analyzeAndRenderCSV(file: File, fileWriter: FileWriter)
{
	var statsCollector : LinkedHashMap = new LinkedHashMap();
	
	loopDir(file,statsCollector,fileWriter);
	
	var iter : Iterator = statsCollector.entrySet().iterator();
	var foldername : String = file.getFullPath();
	var entry : MapEntry;
	var value : Number;
	var key : String;
	
	if(iter.hasNext())fileWriter.write(foldername+",");
	
	while(iter.hasNext())
	{
		entry = iter.next();
		value = entry.getValue();
		key = entry.getKey();

		if(key.indexOf(counterTotalSizeFileType)!=-1)
		{
			key = key.split("|").pop();
			fileWriter.write(key+",");
			fileWriter.write(value+",");
		}
		else if(key.indexOf(counterAll)!=-1)
		{
			fileWriter.write(value + '\n');
			if(iter.hasNext())fileWriter.write(foldername+",");
		}
		else
		{
			fileWriter.write(value+",");
		}	
	}
}

function loopDir (file: File, statsCollector : HashMap,fileWriter: FileWriter)
{
	var files : ArrayList = file.listFiles();
	
	if(files!=null)
	{
		var filesIter : Iterator = files.iterator();
	
		while (filesIter.hasNext())
		{		
			checkFile(filesIter.next(), statsCollector, fileWriter);
		}
	}
}

function checkFile(file: File, statsCollector : HashMap,fileWriter: FileWriter) 
{
	if(file.isDirectory())
	{
		analyzeAndRenderCSV(file, fileWriter);
	}
	else
	{
		var length : Number = file.length();
		var type : String = file.getName().split(".").pop().toString();
		
		incFileStats(statsCollector,type,length);
 	}
}

function incStats(statsCollector : HashMap, counter: String, value : Number)
{	
	if(statsCollector.containsKey(counter))
	{
		var oldValue : Number = statsCollector.get(counter);
		statsCollector.put(counter,oldValue+value);	
	}
	else
	{
		statsCollector.put(counter,value);	
	}
}

function incFileStats (statsCollector : HashMap , fileType: String, value : Number)
{
	if(statsCollector.containsKey(fileType))
	{
		incFileType(statsCollector,fileType,value);
	}
	else
	{
		incStats(statsCollector,counterTotalSizeFileType+"|"+fileType,0);
		incStats(statsCollector,fileType+"|"+counterPercent,0);	
		incStats(statsCollector,fileType+"|"+counter1KB,0);	
		incStats(statsCollector,fileType+"|"+counter10KB,0);
		incStats(statsCollector,fileType+"|"+counter100KB,0);
		incStats(statsCollector,fileType+"|"+counter1MB,0);
		incStats(statsCollector,fileType+"|"+counter10MB,0);
		incStats(statsCollector,fileType+"|"+counter100MB,0);
		incStats(statsCollector,fileType+"|"+counter1000MB,0);
		incStats(statsCollector,fileType+"|"+counterAll,0);
		incFileType(statsCollector,fileType,value);
	}
}

function incFileType(statsCollector : HashMap , fileType: String, value:Number)
{
	incStats(statsCollector,counterTotalSizeFileType+"|"+fileType,value);
	
	if (value>SIZE_100MB) incStats(statsCollector,fileType+"|"+counter1000MB,1);
	else if (value>SIZE_10MB) incStats(statsCollector,fileType+"|"+counter100MB,1);
	else if (value>SIZE_1MB) incStats(statsCollector,fileType+"|"+counter10MB,1);
	else if (value>SIZE_100KB) incStats(statsCollector,fileType+"|"+counter1MB,1);
	else if (value>SIZE_10KB) incStats(statsCollector,fileType+"|"+counter100KB,1);
	else if (value>SIZE_1KB) incStats(statsCollector,fileType+"|"+counter10KB,1);
	else if (value<=SIZE_1KB) incStats(statsCollector,fileType+"|"+counter1KB,1);	
	
	incStats(statsCollector,fileType+"|"+counterAll,1);
}

var AnalyzationTypes : Array = [ 'SubDirectorySize', 'OverallFileTypes', 'FileTypesPerDirectory' ];

/**
 * Base infrastructrure class for service framwork. If a service implementation needs to override
 * a method, the overridden method can always be called using this._super();
 *
 * @class
 * @augments Class
 * Base class of all web services.
 */
var DirectoryAnalyzer = Class.extend({
/** @lends DirectoryAnalyzer.prototype */

	/**
	*	@constructs AbstractHTTPService
	*	Initialises the Base service and important properties for the HTTP Service 
	*/
	init : function( type : String, directory : File ) {
		this.type = type;
		this.directory = directory;
	},
	
	generateReport : function() {
		var type : String = this.type;
		switch ( this.type ) {
			case 'SubDirectorySize' :	var analyzerResult = {
											type: 'SubDirectorySize',
											headers: [ 'Directory', 'SIZE MB', 'Percentage' ],
											reportLines: [],
											total:0	
										};
										this.getSubDirectorySize( this.directory, analyzerResult, false );
										analyzerResult.reportLines.sort( this.sortByDirectorySize );
										
										//calculate overall size
										var overallSize = 0;
										for each (let recordLine in analyzerResult.reportLines ) {
											overallSize += recordLine[1];
										}
										var overallMoney : Money = new Money(overallSize, 'USD');
										//add percentages
										for each (let recordLine in analyzerResult.reportLines ) {
											recordLine.push( new Money(recordLine[1], 'USD').percentOf(overallMoney) );
											recordLine[1] = new Money(recordLine[1] / (1024 * 1024), 'USD').value;
										}
										
										return analyzerResult;
										break;
			case 'OverallFileTypes' : 	var analyzerResult = {
											type: 'OverallFileTypes',
											headers: [ 'Extension', 'SIZE MB', 'Percentage' ],
											reportLines: [],
											total:0	
										};
										this.getOverallFileTypes( this.directory, analyzerResult, null, true );
										analyzerResult.reportLines.sort( this.sortByDirectorySize );
										
										//calculate overall size
										var overallSize = 0;
										for each (let recordLine in analyzerResult.reportLines ) {
											overallSize += recordLine[1];
										}
										var overallMoney : Money = new Money(overallSize, 'USD');
										//add percentages
										for each (let recordLine in analyzerResult.reportLines ) {
											recordLine.push( new Money(recordLine[1], 'USD').percentOf(overallMoney) );
											recordLine[1] = new Money(recordLine[1] / (1024 * 1024), 'USD').value;
										}
										
										return analyzerResult;
										break;
			case 'FileTypesPerDirectory' : 	var stringWriter : StringWriter = new StringWriter();
											analyzeAndRenderCSV( this.directory, stringWriter);
											stringWriter.close();
											var reportLines = stringWriter.toString();
											var analyzerResult = {
																	type: 'FileTypesPerDirectory',
																	headers:['Directory', 'Extension', 'SIZE MB', 'Percent', '<1KB', '1KB-10KB', '10KB-100KB', '100KB-1MB', '1MB-10MB', '10MB-100MB', '>100MB', 'File#'],
																	reportLines:[]
																};
											var overallSize : Number = 0;
											for each (var reportLine : String in reportLines.split('\n')) {
												var splitRecordLine : Array = reportLine.split(',');
												if ( !empty(splitRecordLine[2]) ) {
													overallSize += parseFloat(splitRecordLine[2]);
												}
												analyzerResult.reportLines.push(splitRecordLine);
											}
											var overallMoney : Money = new Money(overallSize, 'USD');
											//removing last line --> should be empty
											analyzerResult.reportLines.pop();
											analyzerResult.reportLines.sort( this.sortAnalyzedDirectories );
											for each (let recordLine : Array in analyzerResult.reportLines ) {
												recordLine[3] = new Money(recordLine[2], 'USD').percentOf(overallMoney);
												recordLine[2] = new Money(recordLine[2] / (1024 * 1024), 'USD').value;
											}
											return analyzerResult;
											break;
		}
	},
	
	getSubDirectorySize : function ( directory : File, analyzerResult : Object, subdirectory : Boolean ) : Number {
		if ( !empty(directory) && directory.directory ) {
			var directorySize : Number = 0;
			var self = this;
			directory.listFiles( function( file : File ) { 
				//avoid endless loops
				if ( ['..', '.'].indexOf(file.name) == -1 ) {
					if ( file.directory ) {
						let subdirectorySize : Number = self.getSubDirectorySize( file, null, true );
						if ( subdirectory ) {
							directorySize += subdirectorySize; 
						} else {
							let resultLineArray : Array = [ file.name, subdirectorySize ];
							analyzerResult.reportLines.push( resultLineArray );
						}
					} else {
						directorySize += file.length();
					}
				}
				return false;
			});
			if ( !subdirectory ) { 
				let resultLineArray : Array = [ '.', directorySize ];
				analyzerResult.reportLines.push( resultLineArray );
			}	
			return directorySize;
		}
	},
	
	getOverallFileTypes : function ( directory : File, analyzerResult : Object, extensionRegistry : Object, rootFolder : Boolean ) : Number {
		if ( directory && directory.directory ) {
			var extensionRegistry : Object = extensionRegistry;
			if ( !extensionRegistry ) {
				extensionRegistry = {};
			}
			var self = this;
			var files : ArrayList = directory.listFiles( function ( file : File ) {
				//avoid endless loops
				if ( ['..', '.'].indexOf(file.name) == -1 ) {
					if ( file.directory ) {
						self.getOverallFileTypes( file, null, extensionRegistry, false );
					} else {
						var fileExtension : String = file.name.split(".").pop().toString();
						var extensionOverall : Number = extensionRegistry[ fileExtension ] || 0 ;
						extensionOverall += file.length();
						extensionRegistry[ fileExtension ] = extensionOverall;
					}
				}
				return false;
			});
			if ( rootFolder ) {
				for ( let extension : String in extensionRegistry ) {
					let resultLineArray : Array = [ extension, extensionRegistry[extension] ];
					analyzerResult.reportLines.push( resultLineArray );
				}
			}	
		}
	},


	sortByDirectory: function ( e1 : Object, e2 : Object) : Number {
		if ( e1[0] == e2[0] ) {
			if ( e1[1] > e2[1]) {
				return 1;
			} else {
				return -1;
			}
		} else if ( e1[0] > e2[0]) {
			return 1;
		} else if ( e1[0] < e2[0]) {
			return -1;
		}
		return 0;
	},
	
	sortByDirectorySize: function ( e1 : Object, e2 : Object) : Number {
		if ( e1[1] == e2[1] ) {
			if ( e1[0] > e2[0]) {
				return -1;
			} else {
				return 1;
			}
		} else if ( e1[1] > e2[1]) {
			return -1;
		} else if ( e1[1] < e2[1]) {
			return 1;
		}
		return 0;
	}
});

//Exports the function that can be extended by other service implementations
module.exports = DirectoryAnalyzer;