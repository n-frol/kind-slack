/* eslint-disable no-mixed-operators */
/* eslint-disable no-cond-assign */
(function (root) {
    'use strict';
    // A list of regular expressions that match arbitrary IPv4 addresses,
    // for which a number of weird notations exist.
    // Note that an address like 0010.0xa5.1.1 is considered legal.
    var ipv4Part = '(0?\\d+|0x[a-f0-9]+)';
    var ipv4Regexes = {
        fourOctet: new RegExp('^' + ipv4Part + '\\.' + ipv4Part + '\\.' + ipv4Part + '\\.' + ipv4Part + '$', 'i'),
        threeOctet: new RegExp('^' + ipv4Part + '\\.' + ipv4Part + '\\.' + ipv4Part + '$', 'i'),
        twoOctet: new RegExp('^' + ipv4Part + '\\.' + ipv4Part + '$', 'i'),
        longValue: new RegExp('^' + ipv4Part + '$', 'i')
    };

    var zoneIndex = '%[0-9a-z]{1,}';

    // IPv6-matching regular expressions.
    // For IPv6, the task is simpler: it is enough to match the colon-delimited
    // hexadecimal IPv6 and a transitional variant with dotted-decimal IPv4 at
    // the end.
    var ipv6Part = '(?:[0-9a-f]+::?)+';
    var ipv6Regexes = {
        zoneIndex: new RegExp(zoneIndex, 'i'),
        native: new RegExp('^(::)?(' + ipv6Part + ')?([0-9a-f]+)?(::)?(' + zoneIndex + ')?$', 'i'),
        transitional: new RegExp('^((?:' + ipv6Part + ')|(?:::)(?:' + ipv6Part + ')?)' + ipv4Part + '\\.' + ipv4Part + '\\.' + ipv4Part + '\\.' + ipv4Part + '(' + zoneIndex + ')?$', 'i')
    };

    // Expand :: in an IPv6 address or address part consisting of `parts` groups.
    // eslint-disable-next-line require-jsdoc
    function expandIPv6(string, parts) {
        // More than one '::' means invalid adddress
        if (string.indexOf('::') !== string.lastIndexOf('::')) {
            return null;
        }

        var colonCount = 0;
        var lastColon = -1;
        var zoneId = (string.match(ipv6Regexes.zoneIndex) || [])[0];
        var replacement;
        var replacementCount;

        // Remove zone index and save it for later
        if (zoneId) {
            zoneId = zoneId.substring(1);
            // eslint-disable-next-line no-param-reassign
            string = string.replace(/%.+$/, '');
        }

        // How many parts do we already have?
        // eslint-disable-next-line no-cond-assign
        while ((lastColon = string.indexOf(':', lastColon + 1)) >= 0) {
            colonCount++;
        }

        // 0::0 is two parts more than ::
        if (string.substr(0, 2) === '::') {
            colonCount--;
        }

        if (string.substr(-2, 2) === '::') {
            colonCount--;
        }

        // The following loop would hang if colonCount > parts
        if (colonCount > parts) {
            return null;
        }

        // replacement = ':' + '0:' * (parts - colonCount)
        replacementCount = parts - colonCount;
        replacement = ':';
        while (replacementCount--) {
            replacement += '0:';
        }

        // Insert the missing zeroes
        // eslint-disable-next-line no-param-reassign
        string = string.replace('::', replacement);

        // Trim any garbage which may be hanging around if :: was at the edge in
        // the source strin
        if (string[0] === ':') {
            // eslint-disable-next-line no-param-reassign
            string = string.slice(1);
        }

        if (string[string.length - 1] === ':') {
            // eslint-disable-next-line no-param-reassign
            string = string.slice(0, -1);
        }

        // eslint-disable-next-line no-param-reassign
        parts = (function () {
            var ref = string.split(':');
            var results = [];

            for (var i = 0; i < ref.length; i++) {
                results.push(parseInt(ref[i], 16));
            }

            return results;
        }());

        return {
            parts: parts,
            zoneId: zoneId
        };
    }

    // A generic CIDR (Classless Inter-Domain Routing) RFC1518 range matcher.
    // eslint-disable-next-line require-jsdoc
    function matchCIDR(first, second, partSize, cidrBits) {
        if (first.length !== second.length) {
            throw new Error('ipaddr: cannot match CIDR for objects with different lengths');
        }

        var part = 0;
        var shift;

        while (cidrBits > 0) {
            shift = partSize - cidrBits;
            if (shift < 0) {
                shift = 0;
            }

            if (first[part] >> shift !== second[part] >> shift) {
                return false;
            }

            // eslint-disable-next-line no-param-reassign
            cidrBits -= partSize;
            part += 1;
        }

        return true;
    }

    // eslint-disable-next-line require-jsdoc
    function parseIntAuto(string) {
        if (string[0] === '0' && string[1] !== 'x') {
            return parseInt(string, 8);
        }
        return parseInt(string, 10);
    }

    // eslint-disable-next-line require-jsdoc
    function padPart(part, length) {
        while (part.length < length) {
            // eslint-disable-next-line no-param-reassign
            part = '0' + part;
        }

        return part;
    }

    var ipaddr = {};

    // An utility function to ease named range matching. See examples below.
    // rangeList can contain both IPv4 and IPv6 subnet entries and will not throw errors
    // on matching IPv4 addresses to IPv6 ranges or vice versa.
    ipaddr.subnetMatch = function (address, rangeList, defaultName) {
        var i;
        var rangeName;
        var rangeSubnets;
        var subnet;

        if (defaultName === undefined || defaultName === null) {
            // eslint-disable-next-line no-param-reassign
            defaultName = 'unicast';
        }

        // eslint-disable-next-line no-restricted-syntax
        for (rangeName in rangeList) {
            if (Object.prototype.hasOwnProperty.call(rangeList, rangeName)) {
                rangeSubnets = rangeList[rangeName];
                // ECMA5 Array.isArray isn't available everywhere
                if (rangeSubnets[0] && !(rangeSubnets[0] instanceof Array)) {
                    rangeSubnets = [rangeSubnets];
                }

                for (i = 0; i < rangeSubnets.length; i++) {
                    subnet = rangeSubnets[i];
                    if (address.kind() === subnet[0].kind() && address.match.apply(address, subnet)) {
                        return rangeName;
                    }
                }
            }
        }

        return defaultName;
    };

    // An IPv4 address (RFC791).
    ipaddr.IPv4 = (function () {
        // Constructs a new IPv4 address from an array of four octets
        // in network order (MSB first)
        // Verifies the input.
        // eslint-disable-next-line require-jsdoc
        function IPv4(octets) {
            if (octets.length !== 4) {
                throw new Error('ipaddr: ipv4 octet count should be 4');
            }

            var i;
            var octet;

            for (i = 0; i < octets.length; i++) {
                octet = octets[i];
                if (!((octet >= 0 && octet <= 255))) {
                    throw new Error('ipaddr: ipv4 octet should fit in 8 bits');
                }
            }

            this.octets = octets;
        }

        // The 'kind' method exists on both IPv4 and IPv6 classes.
        IPv4.prototype.kind = function () {
            return 'ipv4';
        };

        // Returns the address in convenient, decimal-dotted format.
        IPv4.prototype.toString = function () {
            return this.octets.join('.');
        };

        // Symmetrical method strictly for aligning with the IPv6 methods.
        IPv4.prototype.toNormalizedString = function () {
            return this.toString();
        };

        // Returns an array of byte-sized values in network order (MSB first)
        IPv4.prototype.toByteArray = function () {
            return this.octets.slice(0);
        };

        // Checks if this address matches other one within given CIDR range.
        IPv4.prototype.match = function (other, cidrRange) {
            var ref;
            if (cidrRange === undefined) {
                ref = other;
                // eslint-disable-next-line no-param-reassign
                other = ref[0];
                // eslint-disable-next-line no-param-reassign
                cidrRange = ref[1];
            }

            if (other.kind() !== 'ipv4') {
                throw new Error('ipaddr: cannot match ipv4 address with non-ipv4 one');
            }

            return matchCIDR(this.octets, other.octets, 8, cidrRange);
        };

        // Special IPv4 address ranges.
        // See also https://en.wikipedia.org/wiki/Reserved_IP_addresses
        IPv4.prototype.SpecialRanges = {
            unspecified: [[new IPv4([0, 0, 0, 0]), 8]],
            broadcast: [[new IPv4([255, 255, 255, 255]), 32]],
            // RFC3171
            multicast: [[new IPv4([224, 0, 0, 0]), 4]],
            // RFC3927
            linkLocal: [[new IPv4([169, 254, 0, 0]), 16]],
            // RFC5735
            loopback: [[new IPv4([127, 0, 0, 0]), 8]],
            // RFC6598
            carrierGradeNat: [[new IPv4([100, 64, 0, 0]), 10]],
            // RFC1918
            private: [
                [new IPv4([10, 0, 0, 0]), 8],
                [new IPv4([172, 16, 0, 0]), 12],
                [new IPv4([192, 168, 0, 0]), 16]
            ],
            // Reserved and testing-only ranges; RFCs 5735, 5737, 2544, 1700
            reserved: [
                [new IPv4([192, 0, 0, 0]), 24],
                [new IPv4([192, 0, 2, 0]), 24],
                [new IPv4([192, 88, 99, 0]), 24],
                [new IPv4([198, 51, 100, 0]), 24],
                [new IPv4([203, 0, 113, 0]), 24],
                [new IPv4([240, 0, 0, 0]), 4]
            ]
        };

        // Checks if the address corresponds to one of the special ranges.
        IPv4.prototype.range = function () {
            return ipaddr.subnetMatch(this, this.SpecialRanges);
        };

        // Converts this IPv4 address to an IPv4-mapped IPv6 address.
        IPv4.prototype.toIPv4MappedAddress = function () {
            return ipaddr.IPv6.parse('::ffff:' + this.toString());
        };

        // returns a number of leading ones in IPv4 address, making sure that
        // the rest is a solid sequence of 0's (valid netmask)
        // returns either the CIDR length or null if mask is not valid
        IPv4.prototype.prefixLengthFromSubnetMask = function () {
            var cidr = 0;
            // non-zero encountered stop scanning for zeroes
            var stop = false;
            // number of zeroes in octet
            var zerotable = {
                0: 8,
                128: 7,
                192: 6,
                224: 5,
                240: 4,
                248: 3,
                252: 2,
                254: 1,
                255: 0
            };
            var i;
            var octet;
            var zeros;

            for (i = 3; i >= 0; i -= 1) {
                octet = this.octets[i];
                if (octet in zerotable) {
                    zeros = zerotable[octet];
                    if (stop && zeros !== 0) {
                        return null;
                    }

                    if (zeros !== 8) {
                        stop = true;
                    }

                    cidr += zeros;
                } else {
                    return null;
                }
            }

            return 32 - cidr;
        };

        return IPv4;
    }());

    // Classful variants (like a.b, where a is an octet, and b is a 24-bit
    // value representing last three octets; this corresponds to a class C
    // address) are omitted due to classless nature of modern Internet.
    ipaddr.IPv4.parser = function (string) {
        var match;
        var part;
        var value;

        // parseInt recognizes all that octal & hexadecimal weirdness for us
        if ((match = string.match(ipv4Regexes.fourOctet))) {
            return (function () {
                var ref = match.slice(1, 6);
                var results = [];

                for (var i = 0; i < ref.length; i++) {
                    part = ref[i];
                    results.push(parseIntAuto(part));
                }

                return results;
            }());
        } else if ((match = string.match(ipv4Regexes.longValue))) {
            value = parseIntAuto(match[1]);
            if (value > 0xffffffff || value < 0) {
                throw new Error('ipaddr: address outside defined range');
            }

            return ((function () {
                var results = [];
                var shift;

                for (shift = 0; shift <= 24; shift += 8) {
                    results.push((value >> shift) & 0xff);
                }

                return results;
            })()).reverse();
        } else if ((match = string.match(ipv4Regexes.twoOctet))) {
            return (function () {
                var ref = match.slice(1, 4);
                var results = [];

                value = parseIntAuto(ref[1]);
                if (value > 0xffffff || value < 0) {
                    throw new Error('ipaddr: address outside defined range');
                }

                results.push(parseIntAuto(ref[0]));
                results.push((value >> 16) & 0xff);
                results.push((value >> 8) & 0xff);
                results.push(value & 0xff);

                return results;
            }());
        } else if ((match = string.match(ipv4Regexes.threeOctet))) {
            return (function () {
                var ref = match.slice(1, 5);
                var results = [];

                value = parseIntAuto(ref[2]);
                if (value > 0xffff || value < 0) {
                    throw new Error('ipaddr: address outside defined range');
                }

                results.push(parseIntAuto(ref[0]));
                results.push(parseIntAuto(ref[1]));
                results.push((value >> 8) & 0xff);
                results.push(value & 0xff);

                return results;
            }());
        }
        return null;
    };

    // An IPv6 address (RFC2460)
    ipaddr.IPv6 = (function () {
        // Constructs an IPv6 address from an array of eight 16 - bit parts
        // or sixteen 8 - bit parts in network order(MSB first).
        // Throws an error if the input is invalid.
        // eslint-disable-next-line require-jsdoc
        function IPv6(parts, zoneId) {
            var i;
            var part;

            if (parts.length === 16) {
                this.parts = [];
                for (i = 0; i <= 14; i += 2) {
                    this.parts.push((parts[i] << 8) | parts[i + 1]);
                }
            } else if (parts.length === 8) {
                this.parts = parts;
            } else {
                throw new Error('ipaddr: ipv6 part count should be 8 or 16');
            }

            for (i = 0; i < this.parts.length; i++) {
                part = this.parts[i];
                if (!((part >= 0 && part <= 0xffff))) {
                    throw new Error('ipaddr: ipv6 part should fit in 16 bits');
                }
            }

            if (zoneId) {
                this.zoneId = zoneId;
            }
        }

        // The 'kind' method exists on both IPv4 and IPv6 classes.
        IPv6.prototype.kind = function () {
            return 'ipv6';
        };

        // Returns the address in compact, human-readable format like
        // 2001:db8:8:66::1
        //
        // Deprecated: use toRFC5952String() instead.
        IPv6.prototype.toString = function () {
            // Replace the first sequence of 1 or more '0' parts with '::'
            return this.toNormalizedString().replace(/((^|:)(0(:|$))+)/, '::');
        };

        // Returns the address in compact, human-readable format like
        // 2001:db8:8:66::1
        // in line with RFC 5952 (see https://tools.ietf.org/html/rfc5952#section-4)
        IPv6.prototype.toRFC5952String = function () {
            var regex = /((^|:)(0(:|$)){2,})/g;
            var string = this.toNormalizedString();
            var bestMatchIndex = 0;
            var bestMatchLength = -1;
            var match;

            while ((match = regex.exec(string))) {
                if (match[0].length > bestMatchLength) {
                    bestMatchIndex = match.index;
                    bestMatchLength = match[0].length;
                }
            }

            if (bestMatchLength < 0) {
                return string;
            }

            return string.substring(0, bestMatchIndex) + '::' + string.substring(bestMatchIndex + bestMatchLength);
        };

        // Returns an array of byte-sized values in network order (MSB first)
        IPv6.prototype.toByteArray = function () {
            var part;
            var bytes = [];
            var ref = this.parts;
            for (var i = 0; i < ref.length; i++) {
                part = ref[i];
                bytes.push(part >> 8);
                bytes.push(part & 0xff);
            }

            return bytes;
        };

        // Returns the address in expanded format with all zeroes included, like
        // 2001:db8:8:66:0:0:0:1
        //
        // Deprecated: use toFixedLengthString() instead.
        IPv6.prototype.toNormalizedString = function () {
            var addr = ((function () {
                var results = [];

                for (var i = 0; i < this.parts.length; i++) {
                    results.push(this.parts[i].toString(16));
                }

                return results;
            }).call(this)).join(':');

            var suffix = '';

            if (this.zoneId) {
                suffix = '%' + this.zoneId;
            }

            return addr + suffix;
        };

        // Returns the address in expanded format with all zeroes included, like
        // 2001:0db8:0008:0066:0000:0000:0000:0001
        IPv6.prototype.toFixedLengthString = function () {
            var addr = ((function () {
                var results = [];
                for (var i = 0; i < this.parts.length; i++) {
                    results.push(padPart(this.parts[i].toString(16), 4));
                }

                return results;
            }).call(this)).join(':');

            var suffix = '';

            if (this.zoneId) {
                suffix = '%' + this.zoneId;
            }

            return addr + suffix;
        };

        // Checks if this address matches other one within given CIDR range.
        IPv6.prototype.match = function (other, cidrRange) {
            var ref;

            if (cidrRange === undefined) {
                ref = other;
                // eslint-disable-next-line no-param-reassign
                other = ref[0];
                // eslint-disable-next-line no-param-reassign
                cidrRange = ref[1];
            }

            if (other.kind() !== 'ipv6') {
                throw new Error('ipaddr: cannot match ipv6 address with non-ipv6 one');
            }

            return matchCIDR(this.parts, other.parts, 16, cidrRange);
        };

        // Special IPv6 ranges
        IPv6.prototype.SpecialRanges = {
            // RFC4291, here and after
            unspecified: [new IPv6([0, 0, 0, 0, 0, 0, 0, 0]), 128],
            linkLocal: [new IPv6([0xfe80, 0, 0, 0, 0, 0, 0, 0]), 10],
            multicast: [new IPv6([0xff00, 0, 0, 0, 0, 0, 0, 0]), 8],
            loopback: [new IPv6([0, 0, 0, 0, 0, 0, 0, 1]), 128],
            uniqueLocal: [new IPv6([0xfc00, 0, 0, 0, 0, 0, 0, 0]), 7],
            ipv4Mapped: [new IPv6([0, 0, 0, 0, 0, 0xffff, 0, 0]), 96],
            // RFC6145
            rfc6145: [new IPv6([0, 0, 0, 0, 0xffff, 0, 0, 0]), 96],
            // RFC6052
            rfc6052: [new IPv6([0x64, 0xff9b, 0, 0, 0, 0, 0, 0]), 96],
            // RFC3056
            '6to4': [new IPv6([0x2002, 0, 0, 0, 0, 0, 0, 0]), 16],
            // RFC6052, RFC6146
            teredo: [new IPv6([0x2001, 0, 0, 0, 0, 0, 0, 0]), 32],
            // RFC4291
            reserved: [[new IPv6([0x2001, 0xdb8, 0, 0, 0, 0, 0, 0]), 32]]
        };

        // Checks if the address corresponds to one of the special ranges.
        IPv6.prototype.range = function () {
            return ipaddr.subnetMatch(this, this.SpecialRanges);
        };

        // Checks if this address is an IPv4-mapped IPv6 address.
        IPv6.prototype.isIPv4MappedAddress = function () {
            return this.range() === 'ipv4Mapped';
        };

        // Converts this address to IPv4 address if it is an IPv4-mapped IPv6 address.
        // Throws an error otherwise.
        IPv6.prototype.toIPv4Address = function () {
            if (!this.isIPv4MappedAddress()) {
                throw new Error('ipaddr: trying to convert a generic ipv6 address to ipv4');
            }

            var ref = this.parts.slice(-2);
            var high = ref[0];
            var low = ref[1];

            return new ipaddr.IPv4([high >> 8, high & 0xff, low >> 8, low & 0xff]);
        };

        // returns a number of leading ones in IPv6 address, making sure that
        // the rest is a solid sequence of 0's (valid netmask)
        // returns either the CIDR length or null if mask is not valid
        IPv6.prototype.prefixLengthFromSubnetMask = function () {
            var cidr = 0;
            // non-zero encountered stop scanning for zeroes
            var stop = false;
            // number of zeroes in octet
            var zerotable = {
                0: 16,
                32768: 15,
                49152: 14,
                57344: 13,
                61440: 12,
                63488: 11,
                64512: 10,
                65024: 9,
                65280: 8,
                65408: 7,
                65472: 6,
                65504: 5,
                65520: 4,
                65528: 3,
                65532: 2,
                65534: 1,
                65535: 0
            };
            var part;
            var zeros;

            for (var i = 7; i >= 0; i -= 1) {
                part = this.parts[i];
                if (part in zerotable) {
                    zeros = zerotable[part];
                    if (stop && zeros !== 0) {
                        return null;
                    }

                    if (zeros !== 16) {
                        stop = true;
                    }

                    cidr += zeros;
                } else {
                    return null;
                }
            }

            return 128 - cidr;
        };

        return IPv6;
    }());

    // Parse an IPv6 address.
    ipaddr.IPv6.parser = function (string) {
        var addr;
        var i;
        var match;
        var octet;
        var octets;
        var zoneId;

        if (ipv6Regexes.native.test(string)) {
            return expandIPv6(string, 8);
        } else if ((match = string.match(ipv6Regexes.transitional))) {
            zoneId = match[6] || '';
            addr = expandIPv6(match[1].slice(0, -1) + zoneId, 6);
            if (addr.parts) {
                octets = [
                    parseInt(match[2], 10),
                    parseInt(match[3], 10),
                    parseInt(match[4], 10),
                    parseInt(match[5], 10)
                ];
                for (i = 0; i < octets.length; i++) {
                    octet = octets[i];
                    if (!((octet >= 0 && octet <= 255))) {
                        return null;
                    }
                }

                addr.parts.push(octets[0] << 8 | octets[1]);
                addr.parts.push(octets[2] << 8 | octets[3]);
                return {
                    parts: addr.parts,
                    zoneId: addr.zoneId
                };
            }
        }

        return null;
    };

    // Checks if a given string is formatted like IPv4 address.
    ipaddr.IPv4.isIPv4 = function (string) {
        return this.parser(string) !== null;
    };

    // Checks if a given string is formatted like IPv6 address.
    ipaddr.IPv6.isIPv6 = function (string) {
        return this.parser(string) !== null;
    };

    // Checks if a given string is a valid IPv4/IPv6 address.
    ipaddr.IPv4.isValid = function (string) {
        try {
            // eslint-disable-next-line no-new
            new this(this.parser(string));
            return true;
        } catch (e) {
            return false;
        }
    };

    ipaddr.IPv4.isValidFourPartDecimal = function (string) {
        if (ipaddr.IPv4.isValid(string) && string.match(/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){3}$/)) {
            return true;
        }
        return false;
    };

    ipaddr.IPv6.isValid = function (string) {
        // Since IPv6.isValid is always called first, this shortcut
        // provides a substantial performance gain.
        if (typeof string === 'string' && string.indexOf(':') === -1) {
            return false;
        }

        try {
            var addr = this.parser(string);
            // eslint-disable-next-line no-new
            new this(addr.parts, addr.zoneId);
            return true;
        } catch (e) {
            return false;
        }
    };

    // Tries to parse and validate a string with IPv4 address.
    // Throws an error if it fails.
    ipaddr.IPv4.parse = function (string) {
        var parts = this.parser(string);

        if (parts === null) {
            throw new Error('ipaddr: string is not formatted like ip address');
        }

        return new this(parts);
    };

    // Tries to parse and validate a string with IPv6 address.
    // Throws an error if it fails.
    ipaddr.IPv6.parse = function (string) {
        var addr = this.parser(string);

        if (addr.parts === null) {
            throw new Error('ipaddr: string is not formatted like ip address');
        }

        return new this(addr.parts, addr.zoneId);
    };

    ipaddr.IPv4.parseCIDR = function (string) {
        var match;

        if ((match = string.match(/^(.+)\/(\d+)$/))) {
            var maskLength = parseInt(match[2], 10);
            if (maskLength >= 0 && maskLength <= 32) {
                var parsed = [this.parse(match[1]), maskLength];
                Object.defineProperty(parsed, 'toString', {
                    value: function () {
                        return this.join('/');
                    }
                });
                return parsed;
            }
        }

        throw new Error('ipaddr: string is not formatted like an IPv4 CIDR range');
    };

    // A utility function to return subnet mask in IPv4 format given the prefix length
    ipaddr.IPv4.subnetMaskFromPrefixLength = function (prefix) {
        // eslint-disable-next-line no-param-reassign
        prefix = parseInt(prefix, 10);
        if (prefix < 0 || prefix > 32) {
            throw new Error('ipaddr: invalid IPv4 prefix length');
        }

        var octets = [0, 0, 0, 0];
        var j = 0;
        var filledOctetCount = Math.floor(prefix / 8);

        while (j < filledOctetCount) {
            octets[j] = 255;
            j++;
        }

        if (filledOctetCount < 4) {
            octets[filledOctetCount] = Math.pow(2, prefix % 8) - 1 << 8 - (prefix % 8);
        }

        return new this(octets);
    };

    // A utility function to return broadcast address given the IPv4 interface and prefix length in CIDR notation
    ipaddr.IPv4.broadcastAddressFromCIDR = function (string) {
        try {
            var cidr = this.parseCIDR(string);
            var ipInterfaceOctets = cidr[0].toByteArray();
            var subnetMaskOctets = this.subnetMaskFromPrefixLength(cidr[1]).toByteArray();
            var octets = [];
            var i = 0;
            while (i < 4) {
                // Broadcast address is bitwise OR between ip interface and inverted mask
                octets.push(parseInt(ipInterfaceOctets[i], 10) | parseInt(subnetMaskOctets[i], 10) ^ 255);
                i++;
            }

            return new this(octets);
        } catch (e) {
            throw new Error('ipaddr: the address does not have IPv4 CIDR format');
        }
    };

    // A utility function to return network address given the IPv4 interface and prefix length in CIDR notation
    ipaddr.IPv4.networkAddressFromCIDR = function (string) {
        var cidr;
        var i;
        var ipInterfaceOctets;
        var octets;
        var subnetMaskOctets;

        try {
            cidr = this.parseCIDR(string);
            ipInterfaceOctets = cidr[0].toByteArray();
            subnetMaskOctets = this.subnetMaskFromPrefixLength(cidr[1]).toByteArray();
            octets = [];
            i = 0;
            while (i < 4) {
                // Network address is bitwise AND between ip interface and mask
                octets.push(parseInt(ipInterfaceOctets[i], 10) & parseInt(subnetMaskOctets[i], 10));
                i++;
            }

            return new this(octets);
        } catch (e) {
            throw new Error('ipaddr: the address does not have IPv4 CIDR format');
        }
    };

    ipaddr.IPv6.parseCIDR = function (string) {
        var maskLength;
        var match;
        var parsed;

        if ((match = string.match(/^(.+)\/(\d+)$/))) {
            maskLength = parseInt(match[2], 10);
            if (maskLength >= 0 && maskLength <= 128) {
                parsed = [this.parse(match[1]), maskLength];
                Object.defineProperty(parsed, 'toString', {
                    value: function () {
                        return this.join('/');
                    }
                });
                return parsed;
            }
        }

        throw new Error('ipaddr: string is not formatted like an IPv6 CIDR range');
    };

    // Checks if the address is valid IP address
    ipaddr.isValid = function (string) {
        return ipaddr.IPv6.isValid(string) || ipaddr.IPv4.isValid(string);
    };

    // Try to parse an address and throw an error if it is impossible
    ipaddr.parse = function (string) {
        if (ipaddr.IPv6.isValid(string)) {
            return ipaddr.IPv6.parse(string);
        } else if (ipaddr.IPv4.isValid(string)) {
            return ipaddr.IPv4.parse(string);
        }
        throw new Error('ipaddr: the address has neither IPv6 nor IPv4 format');
    };

    ipaddr.parseCIDR = function (string) {
        try {
            return ipaddr.IPv6.parseCIDR(string);
        } catch (e) {
            try {
                return ipaddr.IPv4.parseCIDR(string);
            } catch (e2) {
                throw new Error('ipaddr: the address has neither IPv6 nor IPv4 CIDR format');
            }
        }
    };

    // Try to parse an array in network order (MSB first) for IPv4 and IPv6
    ipaddr.fromByteArray = function (bytes) {
        var length = bytes.length;

        if (length === 4) {
            return new ipaddr.IPv4(bytes);
        } else if (length === 16) {
            return new ipaddr.IPv6(bytes);
        }
        throw new Error('ipaddr: the binary input is neither an IPv6 nor IPv4 address');
    };

    // Parse an address and return plain IPv4 address if it is an IPv4-mapped address
    ipaddr.process = function (string) {
        var addr = this.parse(string);

        if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
            return addr.toIPv4Address();
        }
        return addr;
    };

    // Export for both the CommonJS and browser-like environment
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ipaddr;
    } else {
        // eslint-disable-next-line no-param-reassign
        root.ipaddr = ipaddr;
    }
}(this));
