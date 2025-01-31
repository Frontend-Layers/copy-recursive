# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-01-31

### Added
- New configurable logging system with three levels:
  - `none`: No logging output (default)
  - `verbose`: Detailed logging of all operations
  - `brief`: Gulp-style concise logging with symbols
- Added symbols for brief logging mode:
  - `→` for file copying
  - `↺` for file overwriting
  - `⠿` for file skipping
  - `⥅` for file renaming
- Path shortening in brief logging mode for better readability

### Changed
- Updated test suite with new test cases for logging functionality
- Improved error handling messages
- Enhanced documentation with logging examples and configuration

### Fixed
- Fixed file path display in verbose logging mode
- Corrected handling of empty directories in flatten mode

## [1.0.0] - 2025-01-31

### Added
- Initial release
- Recursive file and directory copying
- Configurable copy depth and height limits
- Directory flattening option
- Multiple conflict resolution strategies:
  - overwrite
  - skip
  - rename
- Support for single source or multiple sources
- Asynchronous operation with Promises
- Comprehensive error handling
- Full test coverage
- Detailed documentation