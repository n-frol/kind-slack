/**
 * basketHashHelpers.js
 *
 * The MurmurHash3 algorithm was created by Austin Appleby.  This JavaScript port was authored
 * by whitequark (based on Java port by Yonik Seeley) and is placed into the public domain.
 * The author hereby disclaims copyright to this source code.
 *
 * This produces exactly the same hash values as the final C++ version of MurmurHash3 and
 * is thus suitable for producing the same hash values across platforms.
 *
 * There are two versions of this hash implementation. First interprets the string as a
 * sequence of bytes, ignoring most significant byte of each codepoint. The second one
 * interprets the string as a UTF-16 codepoint sequence, and appends each 16-bit codepoint
 * to the hash independently. The latter mode was not written to be compatible with
 * any other implementation, but it should offer better performance for JavaScript-only
 * applications.
 *
 * @see {@link http://github.com/whitequark/murmurhash3-js} for future updates to this file.
 */

var MurmurHash3 = {
    mul32: function (m, n) {
        var nlo = n & 0xffff;
        var nhi = n - nlo;
        return ((nhi * m | 0) + (nlo * m | 0)) | 0;
    },

    /**
     * Returns a byte hash representation of the passed in string.
     *
     * @param {string} data - A strigified object to create a hash from.
     * @param {number} len - The length of the string.
     * @param {number} seed - A random number seed for the hash.
     * @return {number} - The hash representation of the current taxation request.
     */
    hashBytes: function (data, len, seed) {
        var c1 = 0xcc9e2d51;
        var c2 = 0x1b873593;
        var h1 = seed;
        var roundedEnd = len & ~0x3;
        var k1;

        for (var i = 0; i < roundedEnd; i += 4) {
            k1 = (data.charCodeAt(i) & 0xff) |
                ((data.charCodeAt(i + 1) & 0xff) << 8) |
                ((data.charCodeAt(i + 2) & 0xff) << 16) |
                ((data.charCodeAt(i + 3) & 0xff) << 24);

            k1 = this.mul32(k1, c1);
            k1 = ((k1 & 0x1ffff) << 15) | (k1 >>> 17); // ROTL32(k1,15);
            k1 = this.mul32(k1, c2);

            h1 ^= k1;
            h1 = ((h1 & 0x7ffff) << 13) | (h1 >>> 19); // ROTL32(h1,13);
            // eslint-disable-next-line
            h1 = (h1 * 5 + 0xe6546b64) | 0;
        }

        k1 = 0;

        // eslint-disable-next-line
        switch (len % 4) {
            case 3:
                k1 = (data.charCodeAt(roundedEnd + 2) & 0xff) << 16;
                // fallthrough
            case 2:
                k1 |= (data.charCodeAt(roundedEnd + 1) & 0xff) << 8;
                // fallthrough
            case 1:
                k1 |= (data.charCodeAt(roundedEnd) & 0xff);
                k1 = this.mul32(k1, c1);
                k1 = ((k1 & 0x1ffff) << 15) | (k1 >>> 17); // ROTL32(k1,15);
                k1 = this.mul32(k1, c2);
                h1 ^= k1;
        }

        // finalization
        h1 ^= len;

        // fmix(h1);
        h1 ^= h1 >>> 16;
        h1 = this.mul32(h1, 0x85ebca6b);
        h1 ^= h1 >>> 13;
        h1 = this.mul32(h1, 0xc2b2ae35);
        h1 ^= h1 >>> 16;

        return h1;
    },

    hashString: function (data, len, seed) {
        var c1 = 0xcc9e2d51;
        var c2 = 0x1b873593;
        var h1 = seed;
        var roundedEnd = len & ~0x1;
        var k1;

        for (var i = 0; i < roundedEnd; i += 2) {
            k1 = data.charCodeAt(i) | (data.charCodeAt(i + 1) << 16);

            k1 = this.mul32(k1, c1);
            k1 = ((k1 & 0x1ffff) << 15) | (k1 >>> 17); // ROTL32(k1,15);
            k1 = this.mul32(k1, c2);

            h1 ^= k1;
            h1 = ((h1 & 0x7ffff) << 13) | (h1 >>> 19); // ROTL32(h1,13);
            // eslint-disable-next-line
            h1 = (h1 * 5 + 0xe6546b64) | 0;
        }

        // eslint-disable-next-line
        if ((len % 2) == 1) {
            k1 = data.charCodeAt(roundedEnd);
            k1 = this.mul32(k1, c1);
            k1 = ((k1 & 0x1ffff) << 15) | (k1 >>> 17); // ROTL32(k1,15);
            k1 = this.mul32(k1, c2);
            h1 ^= k1;
        }

        // finalization
        h1 ^= (len << 1);

        // fmix(h1);
        h1 ^= h1 >>> 16;
        h1 = this.mul32(h1, 0x85ebca6b);
        h1 ^= h1 >>> 13;
        h1 = this.mul32(h1, 0xc2b2ae35);
        h1 ^= h1 >>> 16;

        return h1;
    }
};

module.exports = MurmurHash3;
