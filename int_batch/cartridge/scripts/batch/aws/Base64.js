var chrsz   = 8;
/**
 * DWRE bytes to byte array
 */
function bytes2binb(bytes)
{
    var bin = Array();
    var mask = (1 << chrsz) - 1;
    for (var i = 0; i < bytes.length * chrsz; i += chrsz)
        bin[i>>5] |= (bytes.byteAt(i / chrsz) & mask) << (32 - chrsz - i%32);
    return bin;
}

var b64pad  = '=';
/**
 * Encode binary Bytes instance to base64 string
 */
exports.encode = function(bytes)
{
    var binarray = bytes2binb(bytes);
    var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var str = '';

    for (var i = 0; i < binarray.length * 4; i += 3)
    {
        var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
            | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8)
            |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
        for (var j = 0; j < 4; j++)
        {
            if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
            else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
        }
    }
    return str;
};
