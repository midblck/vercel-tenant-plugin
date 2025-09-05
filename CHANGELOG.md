# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Version update automation scripts
- Comprehensive development documentation
- Version update guide

### Changed

- Fixed component registration on tenant collection for tenant sync

## [0.1.10] - 2025-01-05

### Fixed

- **Critical Fix**: Resolved double deployment issue when updating environment variables with auto-deploy enabled
- Added 30-second protection window to prevent multiple auto-deployments for the same environment variable update
- Improved hook execution tracking to prevent duplicate Vercel deployments
- Enhanced logging to show when auto-deployments are skipped due to recent triggers

### Changed

- Modified `envvarsAfterChangeHook` to directly trigger deployments instead of creating intermediate database records
- Added document-specific auto-deployment tracking using both document ID and tenant ID
- Updated deployment trigger logic to eliminate hook chain reactions

## [0.1.9] - 2025-01-04

### Fixed

- Fixed logger scope issue in tenantCounts endpoint
- Applied void pattern to all logger calls for better performance
- Resolved TypeScript compilation errors in deploymentHooks
- Fixed parameter ordering in deleteEnvironmentVariablesDirect function

### Changed

- Improved error handling and logging consistency across all endpoints
- Enhanced code quality with proper void operator usage for logger calls
- Removed unused req parameter from dashboardDeploymentDeleteHook

## [0.1.8] - 2025-01-04

### Fixed

- Fixed TypeScript errors in endpoints and hooks
- Resolved parameter naming issues in deleteEnvironmentVariable endpoint
- Fixed function signature in deploymentHooks
- Corrected getVercelCredentials calls in listProjects endpoint

### Changed

- Updated deleteEnvironmentVariablesDirect function to accept payload parameter
- Enhanced error handling in environment variable deletion process

## [0.1.7] - 2025-01-03

### Fixed

- Fixed "Unexpected end of JSON input" error in `cancelDeployments` endpoint when called with empty request body
- Added proper error handling for JSON parsing in `cancelDeployments` endpoint to handle malformed or empty request bodies

## [0.1.5] - 2025-01-03

### Fixed

- Fixed missing vercelEnhanced module import in test files
- Converted all Jest syntax to Vitest syntax for better compatibility
- Fixed integration test failures with tenant creation validation
- Resolved Playwright configuration conflicts with Vitest
- Fixed test expectations for relationship fields in PayloadCMS
- Updated collection name references in integration tests
- Fixed vercelDataMapper test expectations for createNewTenantData function

### Changed

- Updated update:patch script to run only integration tests (excluded e2e tests)
- Improved test configuration to exclude e2e tests from Vitest runs
- Enhanced integration tests to properly test plugin functionality
- Updated test files to use proper Vitest imports and syntax

### Technical Improvements

- All 75 integration tests now passing
- Streamlined test execution for faster CI/CD
- Better separation between unit/integration tests and e2e tests
- Improved test reliability and maintainability

## [0.1.4] - 2024-09-03

### Fixed

- Fixed component registration to use scoped package name (@midblck/vercel-tenant-plugin/client)
- Resolved import map generation issues
- Fixed RSC exports for better compatibility

### Changed

- Updated component paths in plugin registration
- Enhanced package exports configuration

## [0.1.3] - 2024-09-03

### Fixed

- Fixed RSC exports to properly export client components
- Added collections export path to package.json
- Enhanced package exports configuration

### Added

- Collections export path for better modularity

## [0.1.2] - 2024-09-03

### Fixed

- Fixed package exports to point to built files instead of source files
- Resolved module resolution issues when installing from npm
- Updated package.json main and types fields

### Changed

- Package now correctly exports from dist/ folder
- Improved package structure for npm publishing

## [0.1.1] - 2024-09-03

### Fixed

- Fixed npm badge URL to use img.shields.io
- Updated README with correct installation commands
- Fixed TypeScript type casting in environment variables endpoint

### Changed

- Updated all documentation to use scoped package name
- Improved package configuration

## [0.1.0] - 2024-09-03

### Added

- Initial release of @midblck/vercel-tenant-plugin
- Multi-tenant Vercel project management
- Automated deployment management
- Environment variable management
- Admin dashboard components
- Real-time sync with Vercel API
- Comprehensive API endpoints
- TypeScript support
- Full Payload CMS v3 integration

### Features

- Tenant collection management
- Deployment tracking and management
- Environment variable synchronization
- Vercel API integration
- Admin UI components
- Real-time status updates
- Comprehensive error handling
- Security features

---

## Version Update Instructions

### For Patch Updates (Bug Fixes)

```bash
pnpm update:patch
```

### For Minor Updates (New Features)

```bash
pnpm update:minor
```

### For Major Updates (Breaking Changes)

```bash
pnpm update:major
```

### Check Current Version

```bash
pnpm version:check
```

## Installation

```bash
npm install @midblck/vercel-tenant-plugin
```

## Documentation

- [README.md](README.md) - Main documentation
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide
- [VERSION_UPDATE_GUIDE.md](VERSION_UPDATE_GUIDE.md) - Version update guide
