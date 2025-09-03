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

- Improved development workflow

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
