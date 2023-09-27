# DWRE Magnet Integration

Cartridge to facilitate collection live metrics, monitoring, analytics and logging from DWRE instances.

- Storefront cartridge `app_magnet` for live metrics
- Requires authentication with agent user permissions in the `X-Magnet-Auth` header (`username:password`)
- Provides jobs to facilitate export of metrics data

## Installation

1. Add cartridge to site code
2. Import metadata from metadata folder
    1. Ensure site specific items such as cartridge path and SITEID/SITENAME are modified to fit target site.

Note: The custom object(s) `MagnetSetting` can be modified to set certain initial parameters such as the start date for order exports.

## License

This software is Copyright 2015-2016 PixelMEDIA, Inc. All Rights Reserved.

Use of this software is only allowed under the expressed written permission of PixelMEDIA, Inc. Any other use is strictly prohibited.
