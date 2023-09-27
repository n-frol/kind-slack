/**
 * Generates a filename suitable for batch exports
 *   @input Prefix : String Filename prefix
 *   @input Directory : String
 *   @input Suffix : String
 *   @output Filename : String
 *
 */
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');

/*eslint no-unused-vars:0*/
function execute(args)
{
    var DATE_FMT = 'YYYYMMdd\'T\'HHmmss\'Z\'';

    var suffix = '.xml';
    if (!empty(args.Suffix)) {
        suffix = args.Suffix;
    }

    var cal = new Calendar(new Date());
    args.Filename = args.Directory + '/' + args.Prefix + StringUtils.formatCalendar(cal, DATE_FMT) + suffix;

    return PIPELET_NEXT;
}