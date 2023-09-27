# Job Components

## Introduction
This cartridge provides a toolbox for basic operations usually done in jobs. It is supposed to represent a successor for the [CS Integration Framework](https://github.com/SalesforceCommerceCloud/integrationframework)'s Standard Components. This project is part of the [Commerce Cloud Community Suite](https://developer.commercecloud.com/s/article/Commerce-Cloud-Community-Suite).

## Documentation

### Setup

 - Add cartridge to your code version, upload to target instance
 - Add cartridge to cartridge paths for all Sites that are used as context with the desired job
 - Go to Job Schedules tool in BM, add steps to your job using one of the `custom.CSComponents` step types
 - Configure, run job
 - done!

### List of Step Types

#### custom.CSComponents.Import* - Standard Imports

 - _ImportABTests - DEPRECATED_
 - _ImportActiveData - DEPRECATED_
 - _ImportContent - DEPRECATED_
 - _ImportCoupons - DEPRECATED_
 - _ImportCustomerGroups - DEPRECATED_
 - _ImportCustomerList - DEPRECATED_
 - _ImportCustomers - DEPRECATED_
 - ImportCustomObjects
 - _ImportGiftCertificates - DEPRECATED_
 - ImportInventoryLists
 - _ImportKeyValueMapping - DEPRECATED_
 - ImportPriceAdjustmentLimits
 - ImportProductLists
 - _ImportPromotions - DEPRECATED_
 - _ImportShippingMethods - DEPRECATED_
 - ImportSlots
 - _ImportSourceCodes - DEPRECATED_
 - _ImportStores - DEPRECATED_
 - _ImportTaxTable - DEPRECATED_


#### custom.CSComponents.Export* - Standard Exports

 - _ExportABTests - DEPRECATED_
 - _ExportCatalog - DEPRECATED_
 - _ExportContent - DEPRECATED_
 - _ExportCouponCodes - DEPRECATED_
 - _ExportCoupons - DEPRECATED_
 - _ExportCustomerGroups - DEPRECATED_
 - _ExportCustomerList - DEPRECATED_
 - _ExportCustomers - DEPRECATED_
 - _ExportCustomObjects - DEPRECATED_
 - ExportGiftCertificates
 - ExportInventoryLists
 - _ExportMetadata - DEPRECATED_
 - _ExportOrders - DEPRECATED_
 - ExportPriceAdjustmentLimits
 - _ExportPriceBooks - DEPRECATED_
 - ExportProductLists
 - _ExportPromotions - DEPRECATED_
 - _ExportShippingMethods - DEPRECATED_
 - ExportSlots
 - _ExportSourceCodes - DEPRECATED_
 - _ExportStores - DEPRECATED_

#### custom.CSComponents.MoveFiles

 - Move or copy files from one directory to another
 - Opt-in for overwrite mode
 - Set exit status in case no files were found in source directory
 - Set a file pattern to e.g. filter for specific file types


#### custom.CSComponents.CleanUpFiles

 - Delete files that are older than given age in days
 - Set exit status in case no files were found in source directory
 - Set a file pattern to e.g. filter for specific file types

#### custom.CSComponents.FtpUpload

 - Upload files to an (S)FTP server
 - Configure a non-standard port, set username and password
 - Set exit status in case no files were found in source directory
 - Set a file pattern to e.g. filter for specific file types

#### custom.CSComponents.TimeSlotCondition

  - Determines whether the current time is inside or outside of a defined time slot
  - Let you define if you want to execute subsequent Job of Flow steps if in or outside of the time slot

#### custom.CSComponents.UnzipFiles

 - Unzip found files in a configured target directory
 - Can remove the source archives after completion
 - Can store uncompressed files in sub-folders with archive name in the target directory
 - Set exit status in case no files were found in source directory
 - Set a file pattern to e.g. filter for specific file types

#### custom.CSComponents.ZipFiles

 - Zip recursively found directories and files in a configured target archive path
 - Can remove the source files when those are added to the archive
 - Can remove the source folder after completion as it can be empty (files are moved to the archive, not copied)
 - Set exit status in case no files were found in source directory
 - Set a file pattern to e.g. filter for specific file types

#### custom.CSComponents.OrderGuard

Keep an eye on your storefront by receiving a Notification if no Orders are coming in for a certain amount of time.

 - Job that triggers an Error if no Orders in a particular status are found within a certain amount of time
 - Example: "No orders were exported in the last 60 minutes"
 - Job Error Status can be subscribed to via the Platform Notification Feature
 - Supported triggers: Placed, Paid, Exported
 - Supports a "from" and "to" time so notifications are not sent in the middle of the night

## Contributing

1. Create a fork of this repository.
2. Ensure that your fork is up to date.
3. Create a working branch to hold your changes.
4. After making changes, submit a [pull request](https://github.com/SalesforceCommerceCloud/job-components/pull/new/master).

## License

Licensed under the current NDA and licensing agreement that’s in place with your organization. (Open-source licensing does not apply.)

## Support

This repository is a Salesforce B2C Commerce community plugin maintained by the Salesforce Customer Success Group. This repository isn’t supported by Salesforce Commerce Cloud Support. For feature requests or bugs, please open a GitHub issue. Contributions are welcome.

## Changelog

### [unreleased]

### Changed
 - TimeSlotCondition: Introduced "timezone" Job Parameter to solve daylight saving time issues
 - TimeSlotCondition: Fixed behaviour for WITHIN (this mode never returned SUSPEND)

#### Added
 - OrderGuard step type (formerly "bc_orderwatcher" cartridge)

### [0.0.2](SalesforceCommerceCloud/job-components/releases/tag/0.0.2) 2019-09-09

#### Added
 - FtpDownload step type (using Service Framework - thanks @jordanebachelet!)
 - Standard Imports
 - Standard Exports
 - Possibility for Custom Port in FtpUpload
 - .project file for use with UX Studio
 - UnzipFiles job step: allows you to unzip archives in an local directory
 - ZipFiles job step: allows you to zip files in an archive locally
 - CleanUpFiles job step: allows cleaning up IMPEX directories (thank you @Eric-Machinas)

#### Changed
 - FtpUpload Job step type to utilise Service Framework (also hides credentials)

### [0.0.1](SalesforceCommerceCloud/job-components/releases/tag/0.0.1) 2017-10-26

#### Added
 - eslint configuration, package.json
 - FileCopy and FtpUpload Job step types