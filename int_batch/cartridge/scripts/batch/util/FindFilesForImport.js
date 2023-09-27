/**
 * Generates a filename suitable for batch exports
 *   @input Prefix : String Filename prefix
 *   @input Directory : String
 *   @input Suffix : String
 *   @output Files : dw.util.List
 *
 */
var Calendar = require('dw/util/Calendar');
var Logger = require('dw/system/Logger');
var File = require('dw/io/File');
var ArrayList = require('dw/util/ArrayList');

/*eslint no-unused-vars:0*/
function execute(args)
{
    var log = Logger.getLogger('int_batch');

    var prefix = args.Prefix;

    var suffix = '.xml';
    if (!empty(args.Suffix)) {
        suffix = args.Suffix;
    }

    var directory = new File(File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + args.Directory);

    if (!directory.isDirectory()) {
        log.error(directory.fullPath + ' not found or is not a directory');
        return PIPELET_ERROR;
    }

    var files = directory.listFiles(function(f) {
        return (f.getName().substr(0, prefix.length) === prefix	&&
            f.getName().indexOf(suffix, f.getName().length - suffix.length) !== -1);
    });

    if (empty(files)) {
        log.info('No files for import found with prefix ' + prefix + ', suffix ' + suffix + ' in ' + directory.fullPath);
        args.Files = new ArrayList();
        return PIPELET_NEXT;
    }


    args.Files = files;

    return PIPELET_NEXT;
}
