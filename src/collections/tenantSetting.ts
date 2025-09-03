import type { GlobalConfig } from 'payload'

import { groups } from './groups'

export const tenantSetting: GlobalConfig = {
  slug: 'tenant-setting',
  access: {
    read: () => true,
    update: () => true,
  },
  admin: {
    description:
      'Global tenant settings - provides default values for VERCEL_TOKEN, VERCEL_TEAM_ID, and LOGGER_ENABLED',
    group: groups.tenant,
  },
  fields: [
    {
      name: 'vercelToken',
      type: 'text',
      admin: {
        description: 'Default Vercel API token (fallback from environment variables)',
      },
      defaultValue: process.env.VERCEL_TOKEN || '',
    },
    {
      name: 'vercelTeamId',
      type: 'text',
      admin: {
        description: 'Default Vercel team ID (fallback from environment variables)',
      },
      defaultValue: process.env.VERCEL_TEAM_ID || '',
    },
    {
      name: 'loggerEnabled',
      type: 'checkbox',
      admin: {
        description: 'Global logger enable/disable setting (fallback from environment variables)',
      },
      defaultValue: process.env.LOGGER_ENABLED === 'true',
    },
  ],
}
