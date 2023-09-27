/**
*
*/
var File = require("dw/io/File");

var OrderJobs = require("~/cartridge/scripts/magnet/jobs/orders/OrderJobs");

function execute( args : PipelineDictionary ) : Number
{
	
	var magnetDirectory : File = new File(File.IMPEX  + File.SEPARATOR + "magnet");
	if (!magnetDirectory.exists()) {
		magnetDirectory.mkdir();
	}

	// order jobs
	OrderJobs.AllOrdersJob();
	
	return PIPELET_NEXT;
}