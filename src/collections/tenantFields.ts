import type { Field } from 'payload'

export const tenantFields: Field[] = [
  {
    name: 'name',
    type: 'text',
    admin: {
      description: 'Display name for the tenant',
    },
    hooks: {
      beforeValidate: [
        ({ value }) => {
          if (typeof value === 'string') {
            return value.toLowerCase().replace(/\s+/g, '_').trimEnd()
          }
          return value
        },
      ],
    },
    required: true,
  },
  {
    name: 'isActive',
    type: 'checkbox',
    admin: {
      description: 'Whether this tenant is currently active',
    },
    defaultValue: true,
  },
  {
    name: 'disableCron',
    type: 'checkbox',
    admin: {
      description: 'Disable cron jobs for this project in Vercel',
    },
    defaultValue: false,
  },
  {
    name: 'status',
    type: 'select',
    admin: {
      description: 'Tenant approval status - only approved tenants will create Vercel projects',
    },
    defaultValue: 'draft',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Approved', value: 'approved' },
    ],
  },

  // Git Repository Information
  {
    name: 'vercelProjectGitRepository',
    type: 'group',
    admin: {
      description: 'Git repository configuration',
    },
    fields: [
      {
        name: 'type',
        type: 'text',
        admin: {
          description: 'Git provider (github, gitlab, bitbucket)',
        },
        defaultValue: 'github',
        required: true,
      },
      {
        name: 'owner',
        type: 'text',
        admin: {
          description: 'Repository owner/organization',
        },
        required: true,
      },
      {
        name: 'repo',
        type: 'text',
        admin: {
          description: 'Repository name',
        },
        defaultValue: 'website-starter',
        required: true,
      },
      {
        name: 'branch',
        type: 'text',
        admin: {
          description: 'Production branch',
        },
        defaultValue: 'main',
      },
      {
        name: 'repoId',
        type: 'number',
        admin: {
          description: 'Repository ID from Git provider',
          readOnly: true,
        },
      },
      {
        name: 'repoOwnerId',
        type: 'number',
        admin: {
          description: 'Repository owner ID from Git provider',
          readOnly: true,
        },
      },
    ],
  },
  // Repository Identifiers

  {
    name: 'lastSynced',
    type: 'date',
    admin: {
      description: 'Last time data was synced from Vercel',
      readOnly: true,
    },
  },

  // Vercel Project Data
  {
    name: 'vercelProjectId',
    type: 'text',
    admin: {
      description: 'Unique Vercel project identifier (auto-populated)',
      readOnly: true,
    },
    unique: true,
  },
  {
    name: 'vercelProjectName',
    type: 'text',
    admin: {
      description: 'Project name from Vercel',
      readOnly: true,
    },
  },
  {
    name: 'vercelProjectUrl',
    type: 'text',
    admin: {
      description: 'Live deployment URL',
      readOnly: true,
    },
  },
  {
    name: 'vercelProjectFramework',
    type: 'text',
    admin: {
      description: 'Framework used (e.g., nextjs, react, vue)',
    },
    defaultValue: 'nextjs',
  },
  {
    name: 'vercelProjectEnvironment',
    type: 'select',
    admin: {
      description: 'Deployment environment',
    },
    defaultValue: 'production',
    options: [
      { label: 'Production', value: 'production' },
      { label: 'Preview', value: 'preview' },
      { label: 'Development', value: 'development' },
    ],
  },
  {
    name: 'vercelProjectStatus',
    type: 'text',
    admin: {
      description: 'Current deployment status (READY, BUILDING, ERROR, etc.)',
      readOnly: true,
    },
  },
  // Pause-related fields removed - pause/unpause requires Vercel billing

  // Domains and Team
  {
    name: 'vercelProjectDomains',
    type: 'array',
    admin: {
      description: 'Custom domains associated with the project',
    },
    fields: [
      {
        name: 'domain',
        type: 'text',
        required: true,
      },
      {
        name: 'verified',
        type: 'checkbox',
        admin: {
          description: 'Whether the domain is verified',
        },
        defaultValue: false,
      },
    ],
  },
  {
    name: 'vercelTeamId',
    type: 'text',
    admin: {
      description: 'Vercel team identifier',
      readOnly: true,
    },
    defaultValue: process.env.VERCEL_TEAM_ID || '',
  },

  // Latest Deployment Tracking (only updated on successful deployments)
  {
    name: 'lastDeploymentId',
    type: 'text',
    admin: {
      description: 'ID of the most recent successful deployment',
      readOnly: true,
    },
  },
  {
    name: 'lastDeploymentUrl',
    type: 'text',
    admin: {
      description: 'URL of the most recent successful deployment',
      readOnly: true,
    },
  },
  {
    name: 'lastDeploymentStatus',
    type: 'select',
    admin: {
      description: 'Status of the most recent deployment',
      readOnly: true,
    },
    options: [
      { label: 'Building', value: 'building' },
      { label: 'Ready', value: 'ready' },
      { label: 'Error', value: 'error' },
      { label: 'Canceled', value: 'canceled' },
      { label: 'Queued', value: 'queued' },
    ],
  },
  {
    name: 'lastDeploymentAt',
    type: 'date',
    admin: {
      description: 'When the most recent successful deployment was completed',
      readOnly: true,
    },
  },

  // Latest Deployment Link
  {
    name: 'latestDeployment',
    type: 'relationship',
    admin: {
      description: 'Latest deployment record for this tenant',
      readOnly: true,
    },
    hasMany: false,
    relationTo: 'tenant-deployment',
    required: false,
  },

  // Environment Variables
  {
    name: 'environmentVariables',
    type: 'relationship',
    admin: {
      description: 'Environment variables configuration for this tenant',
      readOnly: true,
    },
    hasMany: false,
    relationTo: 'tenant-envariable',
    required: false,
  },

  // Additional Vercel Project Configuration Fields
  {
    name: 'buildCommand',
    type: 'text',
    admin: {
      description: 'Build command for the Vercel project',
    },
  },
  {
    name: 'devCommand',
    type: 'text',
    admin: {
      description: 'Development command for the Vercel project',
      readOnly: true,
    },
  },
  {
    name: 'installCommand',
    type: 'text',
    admin: {
      description: 'Install command for the Vercel project',
    },
  },
  {
    name: 'outputDirectory',
    type: 'text',
    admin: {
      description: 'Output directory for the Vercel project',
      readOnly: true,
    },
  },
  {
    name: 'rootDirectory',
    type: 'text',
    admin: {
      description: 'Root directory for the Vercel project',
      readOnly: true,
    },
  },
  {
    name: 'nodeVersion',
    type: 'text',
    admin: {
      description: 'Node.js version for the Vercel project',
      readOnly: true,
    },
  },
  {
    name: 'publicSource',
    type: 'checkbox',
    admin: {
      description: 'Whether the project source is public',
      readOnly: true,
    },
  },
  {
    name: 'directoryListing',
    type: 'checkbox',
    admin: {
      description: 'Whether directory listing is enabled',
      readOnly: true,
    },
  },
  {
    name: 'gitForkProtection',
    type: 'checkbox',
    admin: {
      description: 'Whether git fork protection is enabled',
      readOnly: true,
    },
  },
  {
    name: 'gitLFS',
    type: 'checkbox',
    admin: {
      description: 'Whether Git LFS is enabled',
      readOnly: true,
    },
  },
  {
    name: 'gitComments',
    type: 'group',
    admin: {
      description: 'Git comment settings',
      readOnly: true,
    },
    fields: [
      {
        name: 'onPullRequest',
        type: 'checkbox',
        admin: {
          description: 'Enable comments on pull requests',
        },
      },
      {
        name: 'onCommit',
        type: 'checkbox',
        admin: {
          description: 'Enable comments on commits',
        },
      },
    ],
  },
  {
    name: 'gitProviderOptions',
    type: 'group',
    admin: {
      description: 'Git provider options',
      readOnly: true,
    },
    fields: [
      {
        name: 'createDeployments',
        type: 'text',
        admin: {
          description: 'Deployment creation setting',
        },
      },
      {
        name: 'disableRepositoryDispatchEvents',
        type: 'checkbox',
        admin: {
          description: 'Whether to disable repository dispatch events',
        },
      },
    ],
  },
  {
    name: 'live',
    type: 'checkbox',
    admin: {
      description: 'Whether the project is live',
      readOnly: true,
    },
  },
  {
    name: 'paused',
    type: 'checkbox',
    admin: {
      description: 'Whether the project is paused',
      readOnly: true,
    },
  },
  {
    name: 'v0',
    type: 'checkbox',
    admin: {
      description: 'Whether V0 is enabled',
      readOnly: true,
    },
  },
  {
    name: 'tier',
    type: 'text',
    admin: {
      description: 'Project tier (standard, pro, enterprise)',
      readOnly: true,
    },
  },
  {
    name: 'features',
    type: 'json',
    admin: {
      description: 'Project features and capabilities',
      readOnly: true,
    },
  },
  {
    name: 'passwordProtection',
    type: 'json',
    admin: {
      description: 'Password protection settings',
      readOnly: true,
    },
  },
  {
    name: 'ssoProtection',
    type: 'json',
    admin: {
      description: 'SSO protection settings',
      readOnly: true,
    },
  },
  {
    name: 'analytics',
    type: 'json',
    admin: {
      description: 'Analytics configuration',
      readOnly: true,
    },
  },
  {
    name: 'speedInsights',
    type: 'json',
    admin: {
      description: 'Speed insights configuration',
      readOnly: true,
    },
  },
  {
    name: 'webAnalytics',
    type: 'json',
    admin: {
      description: 'Web analytics configuration',
      readOnly: true,
    },
  },
  {
    name: 'resourceConfig',
    type: 'json',
    admin: {
      description: 'Resource configuration',
      readOnly: true,
    },
  },
  {
    name: 'defaultResourceConfig',
    type: 'json',
    admin: {
      description: 'Default resource configuration',
      readOnly: true,
    },
  },
  {
    name: 'customEnvironments',
    type: 'json',
    admin: {
      description: 'Custom environment configurations',
      readOnly: true,
    },
  },
  {
    name: 'connectConfigurationId',
    type: 'text',
    admin: {
      description: 'Connect configuration ID',
      readOnly: true,
    },
  },
  {
    name: 'connectBuildsEnabled',
    type: 'checkbox',
    admin: {
      description: 'Whether connect builds are enabled',
      readOnly: true,
    },
  },
  {
    name: 'autoExposeSystemEnvs',
    type: 'checkbox',
    admin: {
      description: 'Whether to auto-expose system environment variables',
      readOnly: true,
    },
  },
  {
    name: 'autoAssignCustomDomains',
    type: 'checkbox',
    admin: {
      description: 'Whether to auto-assign custom domains',
      readOnly: true,
    },
  },
  {
    name: 'deploymentExpiration',
    type: 'json',
    admin: {
      description: 'Deployment expiration settings',
      readOnly: true,
    },
  },
  {
    name: 'rollingRelease',
    type: 'json',
    admin: {
      description: 'Rolling release configuration',
      readOnly: true,
    },
  },
  {
    name: 'transferCompletedAt',
    type: 'date',
    admin: {
      description: 'When project transfer was completed',
      readOnly: true,
    },
  },
  {
    name: 'transferStartedAt',
    type: 'date',
    admin: {
      description: 'When project transfer was started',
      readOnly: true,
    },
  },
  {
    name: 'transferToAccountId',
    type: 'text',
    admin: {
      description: 'Account ID to transfer project to',
      readOnly: true,
    },
  },
  {
    name: 'transferredFromAccountId',
    type: 'text',
    admin: {
      description: 'Account ID project was transferred from',
      readOnly: true,
    },
  },

  // Timestamps
  {
    name: 'vercelProjectCreatedAt',
    type: 'date',
    admin: {
      description: 'When the project was created in Vercel',
      readOnly: true,
    },
  },
  {
    name: 'vercelProjectUpdatedAt',
    type: 'date',
    admin: {
      description: 'When the project was last updated in Vercel',
      readOnly: true,
    },
  },

  // Sync Status & Data Recording
  // Vercel Sync Section
  {
    name: 'lastSyncStatus',
    type: 'select',
    admin: {
      description: 'Last sync operation status',
      position: 'sidebar',
    },
    defaultValue: 'unsynced',
    options: [
      { label: 'Unsynced', value: 'unsynced' },
      { label: 'Synced', value: 'synced' },
      { label: 'Error', value: 'error' },
    ],
  },
  {
    name: 'vercelSyncSection',
    type: 'ui',
    admin: {
      components: {
        Field: '@midblck/vercel-tenant-plugin/client#TenantSyncSection',
      },
      position: 'sidebar',
    },
  },

  {
    name: 'lastSyncMessage',
    type: 'text',
    admin: {
      description: 'Last sync operation message',
      position: 'sidebar',
      readOnly: true,
    },
  },
  {
    name: 'lastSyncData',
    type: 'json',
    admin: {
      description: 'Last sync operation data from Vercel for recheck',
      position: 'sidebar',
      readOnly: true,
    },
  },
  {
    name: '_syncOrigin',
    type: 'text',
    access: {
      create: () => true, // Allow creation for now to debug
      read: () => true,
      update: () => true, // Allow updates for now to debug
    },
    admin: {
      description: 'Internal flag to track sync operation origin (prevents infinite loops)',
      position: 'sidebar',
      readOnly: true,
    },
  },
]
