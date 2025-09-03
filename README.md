# Vercel Tenant Plugin for Payload CMS

[![npm version](https://img.shields.io/npm/v/@midblck/vercel-tenant-plugin.svg)](https://www.npmjs.com/package/@midblck/vercel-tenant-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Payload CMS](https://img.shields.io/badge/Payload%20CMS-v3-blue.svg)](https://payloadcms.com)

A comprehensive Payload CMS plugin that integrates with Vercel to manage multi-tenant projects, deployments, and environment variables with full lifecycle management.

**📦 Published on NPM**: [@midblck/vercel-tenant-plugin](https://www.npmjs.com/package/@midblck/vercel-tenant-plugin)

## ✨ Features

- 🏗️ **Multi-Tenant Architecture** - Manage multiple Vercel projects from a single Payload CMS instance
- 🚀 **Automated Deployments** - Create, sync, and manage deployments with real-time status tracking
- 🔧 **Environment Variables** - Centralized management of environment variables across all tenants
- 📊 **Admin Dashboard** - Built-in dashboard components for easy management
- 🔄 **Real-time Sync** - Automatic synchronization with Vercel API
- 🛡️ **Security** - Encrypted environment variables and access control integration
- 📈 **Monitoring** - Complete audit trail and deployment history
- 🎯 **Git Integration** - Seamless integration with GitHub repositories

## 🚀 Quick Start

### Installation

```bash
npm install @midblck/vercel-tenant-plugin
# or
pnpm add @midblck/vercel-tenant-plugin
# or
yarn add @midblck/vercel-tenant-plugin
```

### Basic Setup

1. **Add environment variables** to your `.env` file:

```env
VERCEL_TOKEN=your_vercel_api_token_here
VERCEL_TEAM_ID=your_team_id_here  # Optional
```

2. **Configure the plugin** in your Payload config:

```typescript
import { buildConfig } from 'payload'
import { vercelTenantPlugin } from '@midblck/vercel-tenant-plugin'

export default buildConfig({
  plugins: [
    vercelTenantPlugin({
      vercelToken: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      collections: {
        posts: true, // Add relationship fields to specific collections
        users: true,
      },
    }),
  ],
  // ... rest of your config
})
```

3. **Start your Payload CMS** and access the new tenant management interface!

### Getting Your Vercel Token

1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Create a new token with appropriate permissions
3. Copy the token to your environment variables

## 📊 Usage Examples

### Basic API Usage

```typescript
// List all Vercel projects
const projects = await fetch('/api/vercel/projects', {
  method: 'POST',
  body: JSON.stringify({}),
}).then((res) => res.json())

// Create a new tenant
const newTenant = await fetch('/api/vercel/create-tenant', {
  method: 'POST',
  body: JSON.stringify({
    name: 'my-project',
    framework: 'nextjs',
    gitRepository: {
      type: 'github',
      owner: 'username',
      repo: 'repo-name',
    },
  }),
}).then((res) => res.json())

// Sync deployments
const syncResult = await fetch('/api/vercel/sync-deployments', {
  method: 'POST',
  body: JSON.stringify({ syncAll: true }),
}).then((res) => res.json())
```

### Payload CMS Queries

```typescript
// Find active tenants
const activeTenants = await payload.find({
  collection: 'tenant',
  where: {
    isActive: { equals: true },
    status: { equals: 'approved' },
  },
})

// Get latest deployments
const latestDeployments = await payload.find({
  collection: 'tenant-deployment',
  where: {
    status: { equals: 'ready' },
  },
  sort: '-deploymentCreatedAt',
  limit: 10,
})
```

## 🔧 Configuration Options

### Plugin Configuration

```typescript
vercelTenantPlugin({
  vercelToken: process.env.VERCEL_TOKEN, // Required
  teamId: process.env.VERCEL_TEAM_ID, // Optional
  collections: {
    posts: true, // Add relationship fields to specific collections
    users: true,
  },
  disabled: false, // Enable/disable the plugin
})
```

### Environment Variables

| Variable         | Required | Description                             |
| ---------------- | -------- | --------------------------------------- |
| `VERCEL_TOKEN`   | Yes      | Your Vercel API token                   |
| `VERCEL_TEAM_ID` | No       | Your Vercel team ID (for team accounts) |

## 🏗️ Collections

The plugin creates three main collections:

### Tenant Collection

- **Slug**: `tenant`
- **Purpose**: Manages Vercel project tenants with comprehensive metadata
- **Key Fields**: `name`, `vercelProjectId`, `vercelProjectUrl`, `status`, `isActive`

### Tenant Deployment Collection

- **Slug**: `tenant-deployment`
- **Purpose**: Tracks individual deployment instances with detailed event logging
- **Key Fields**: `tenant`, `deploymentId`, `status`, `environment`, `events`

### Tenant Environment Variables Collection

- **Slug**: `tenant-envariable`
- **Purpose**: Manages environment variable configuration per tenant
- **Key Fields**: `tenant`, `environment`, `envVars`, `autodeploy`

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Payload CMS v3
- Vercel account with API access

### Development Setup

```bash
# Clone the repository
git clone https://github.com/midblck/vercel-tenant-plugin.git
cd vercel-tenant-plugin

# Install dependencies
pnpm install

# Copy environment file
cp dev/.env.example dev/.env

# Update .env with your Vercel credentials
# Start development server
pnpm dev
```

### Running Tests

```bash
pnpm test          # Run all tests
pnpm test:int      # Integration tests
pnpm test:e2e      # End-to-end tests
```

### Version Updates

```bash
pnpm update:patch  # Bug fixes (0.1.4 → 0.1.5)
pnpm update:minor  # New features (0.1.4 → 0.2.0)
pnpm update:major  # Breaking changes (0.1.4 → 1.0.0)
pnpm version:check # Check current version
```

## 📋 Version Management

This project follows [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.4 → 0.1.5): Bug fixes, small improvements
- **Minor** (0.1.4 → 0.2.0): New features, backward-compatible changes
- **Major** (0.1.4 → 1.0.0): Breaking changes, major API changes

### Quick Update Commands

```bash
# Update patch version (bug fixes)
pnpm update:patch

# Update minor version (new features)
pnpm update:minor

# Update major version (breaking changes)
pnpm update:major

# Check current version
pnpm version:check
```

For detailed version update instructions, see [VERSION_UPDATE_GUIDE.md](VERSION_UPDATE_GUIDE.md).

## 📚 API Reference

### Available Endpoints

| Endpoint                                   | Method | Description                              |
| ------------------------------------------ | ------ | ---------------------------------------- |
| `/api/vercel/projects`                     | POST   | List all Vercel projects                 |
| `/api/vercel/sync`                         | POST   | Sync Vercel projects to local collection |
| `/api/vercel/create-tenant`                | POST   | Create a new tenant                      |
| `/api/vercel/create-deployment`            | POST   | Create a new deployment                  |
| `/api/vercel/sync-deployments`             | POST   | Sync deployment data                     |
| `/api/vercel/cancel-deployments`           | POST   | Cancel active deployments                |
| `/api/vercel/create-environment-variables` | POST   | Create/update environment variables      |
| `/api/vercel/update-environment-variable`  | PATCH  | Update specific environment variable     |

For detailed API documentation, see:

- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Payload CMS Documentation](https://payloadcms.com/docs)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **NPM Package**: [@midblck/vercel-tenant-plugin](https://www.npmjs.com/package/@midblck/vercel-tenant-plugin)
- **GitHub Issues**: [Report a bug or request a feature](https://github.com/midblck/vercel-tenant-plugin/issues)
- **Documentation**: [Plugin Documentation](https://github.com/midblck/vercel-tenant-plugin#readme)
- **Community**: [Payload CMS Discord](https://discord.gg/payloadcms)

## 🙏 Acknowledgments

- [Payload CMS](https://payloadcms.com) for the amazing headless CMS
- [Vercel](https://vercel.com) for the deployment platform and API
- All contributors who help improve this plugin

---

**Made with ❤️ for the Payload CMS community**
