import type { CollectionConfig } from 'payload'

import { envvarsAfterChangeHook, envvarsBeforeValidateHook } from '../hooks/envvarsHooks'
import { groups } from './groups'

export const tenantEnvironmentVariableCollection: CollectionConfig = {
  slug: 'tenant-envariable',
  admin: {
    defaultColumns: ['tenant', 'environment', 'envVarCount', 'lastUpdated'],
    description: 'Environment variables configuration for tenant projects (one per tenant)',
    group: groups.tenant,
    useAsTitle: 'tenant',
  },
  fields: [
    {
      type: 'row',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'tenant',
          type: 'relationship',
          admin: {
            description: 'Associated tenant project (one environment variable record per tenant)',
          },
          relationTo: 'tenant',
          required: true,
          unique: true,
        },
        {
          name: 'environment',
          type: 'select',
          admin: {
            description: 'Environment where these variables apply',
          },
          defaultValue: 'production',
          options: [
            { label: 'Production', value: 'production' },
            { label: 'Preview', value: 'preview' },
            { label: 'Development', value: 'development' },
          ],
          required: true,
        },
        {
          name: 'autodeploy',
          type: 'checkbox',
          admin: {
            description: 'Whether to automatically deploy when this environment variable changes',
          },
          defaultValue: false,
        },
      ],
    },

    {
      name: 'envVars',
      type: 'array',
      admin: {
        description: 'Environment variables for this tenant',
        initCollapsed: false,
      },
      defaultValue: [
        {
          type: 'plain',
          comment: 'Database connection string',
          isEncrypted: false,
          key: 'DATABASE_URI',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: process.env.DATABASE_URI || 'mongodb://localhost:27017/vercel-tenant-plugin',
        },
        {
          type: 'plain',
          comment: 'Vercel OIDC token',
          isEncrypted: false,
          key: 'VERCEL_OIDC_TOKEN',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: process.env.VERCEL_OIDC_TOKEN || '',
        },
        {
          type: 'plain',
          comment: 'Vercel project production URL',
          isEncrypted: false,
          key: 'VERCEL_PROJECT_PRODUCTION_URL',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: '', // Will be populated by createEnvironmentVariables endpoint
        },
        {
          type: 'plain',
          comment: 'Public server URL',
          isEncrypted: false,
          key: 'NEXT_PUBLIC_SERVER_URL',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: '', // Will be populated by createEnvironmentVariables endpoint
        },
        {
          type: 'plain',
          comment: 'Payload auth URL',
          isEncrypted: false,
          key: 'NEXT_PUBLIC_PAYLOAD_AUTH_URL',
          targets: [{ target: 'production' }, { target: 'development' }],
          value: '', // Will be populated by createEnvironmentVariables endpoint
        },
        {
          type: 'plain',
          comment: 'Payload secret for encryption',
          isEncrypted: true,
          key: 'PAYLOAD_SECRET',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: '', // Will be populated by createEnvironmentVariables endpoint
        },
        {
          type: 'plain',
          comment: 'Payload auth secret',
          isEncrypted: true,
          key: 'PAYLOAD_AUTH_SECRET',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: '', // Will be populated by createEnvironmentVariables endpoint
        },
        {
          type: 'plain',
          comment: 'Preview secret',
          isEncrypted: true,
          key: 'PREVIEW_SECRET',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: '', // Will be populated by createEnvironmentVariables endpoint
        },
        {
          type: 'plain',
          comment: 'Cron job secret',
          isEncrypted: true,
          key: 'CRON_SECRET',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: '', // Will be populated by createEnvironmentVariables endpoint
        },
        {
          type: 'plain',
          comment: 'SMTP host server',
          isEncrypted: false,
          key: 'SMTP_HOST',
          targets: [{ target: 'production' }, { target: 'development' }],
          value: process.env.SMTP_HOST || 'smtp.gmail.com',
        },
        {
          type: 'plain',
          comment: 'SMTP username',
          isEncrypted: false,
          key: 'SMTP_USER',
          targets: [{ target: 'production' }, { target: 'development' }],
          value: process.env.SMTP_USER || 'dev@example.com',
        },
        {
          type: 'plain',
          comment: 'SMTP password',
          isEncrypted: false,
          key: 'SMTP_PASS',
          targets: [{ target: 'production' }, { target: 'development' }],
          value: process.env.SMTP_PASS || 'dev-password',
        },
        {
          type: 'plain',
          comment: 'Google OAuth client ID',
          isEncrypted: false,
          key: 'GOOGLE_CLIENT_ID',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: process.env.GOOGLE_CLIENT_ID || '',
        },
        {
          type: 'plain',
          comment: 'Google OAuth client secret',
          isEncrypted: false,
          key: 'GOOGLE_CLIENT_SECRET',
          targets: [{ target: 'production' }, { target: 'preview' }, { target: 'development' }],
          value: process.env.GOOGLE_CLIENT_SECRET || '',
        },
      ],
      fields: [
        {
          name: 'key',
          type: 'text',
          admin: {
            description: 'Environment variable name',
          },
          required: true,
        },
        {
          name: 'value',
          type: 'textarea',
          admin: {
            description: 'Environment variable value (will be encrypted in production)',
          },
        },
        {
          name: 'type',
          type: 'select',
          admin: {
            description: 'Type of environment variable in Vercel',
          },
          defaultValue: 'plain',
          options: [
            { label: 'Plain', value: 'plain' },
            { label: 'Encrypted', value: 'encrypted' },
            { label: 'System', value: 'system' },
          ],
        },
        {
          name: 'comment',
          type: 'textarea',
          admin: {
            description: 'Comment or description for this environment variable',
          },
        },
        {
          name: 'isEncrypted',
          type: 'checkbox',
          admin: {
            description: 'Whether the value is encrypted',
          },
          defaultValue: false,
        },
        {
          name: 'vercelId',
          type: 'text',
          admin: {
            description: 'Vercel environment variable ID for updates (auto-filled)',
            readOnly: true,
          },
        },
        {
          name: 'targets',
          type: 'array',
          admin: {
            description: 'Target environments in Vercel',
          },
          defaultValue: [
            { target: 'production' },
            { target: 'preview' },
            { target: 'development' },
          ],
          fields: [
            {
              name: 'target',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          name: 'gitBranch',
          type: 'text',
          admin: {
            description: 'Git branch this variable applies to (if any)',
          },
        },
      ],
    },
    {
      name: 'envVarCount',
      type: 'number',
      admin: {
        description: 'Number of environment variables configured',
        readOnly: true,
      },
      defaultValue: 0,
    },
    {
      name: 'lastUpdated',
      type: 'date',
      admin: {
        description: 'When this configuration was last modified',
        readOnly: true,
      },
    },
    {
      name: 'lastSynced',
      type: 'date',
      admin: {
        description: 'When these variables were last synced to Vercel',
        readOnly: true,
      },
    },
    {
      name: 'lastSyncStatus',
      type: 'select',
      admin: {
        description: 'Last sync operation status',
        position: 'sidebar',
      },
      defaultValue: 'synced',
      options: [
        { label: 'Synced', value: 'synced' },
        { label: 'Error', value: 'error' },
      ],
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
      name: '_skipHooks',
      type: 'checkbox',
      admin: {
        description: 'Internal flag to skip hooks during sync operations',
        hidden: true,
      },
      defaultValue: false,
    },
  ],
  hooks: {
    afterChange: [envvarsAfterChangeHook],
    beforeValidate: [envvarsBeforeValidateHook],
  },
  indexes: [
    {
      fields: ['environment'],
    },
    {
      fields: ['lastSynced'],
    },
  ],
}
