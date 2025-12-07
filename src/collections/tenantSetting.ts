import type { GlobalBeforeChangeHook, GlobalConfig } from 'payload'

import { groups } from './groups'

type CredentialInput = {
  accountName?: string
  active?: boolean
  vercelTeamId?: string
  vercelToken?: string
}

const normalizeCredentials: GlobalBeforeChangeHook = ({ data, originalDoc }) => {
  const envCredential: {
    accountName: string
    active: boolean
    vercelTeamId: string
    vercelToken: string
  } | null =
    process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_TEAM_ID?.trim()
      ? {
          accountName: 'Environment default',
          active: true,
          vercelTeamId: process.env.VERCEL_TEAM_ID?.trim() || '',
          vercelToken: process.env.VERCEL_TOKEN?.trim() || '',
        }
      : null

  const incoming: CredentialInput[] = Array.isArray(data?.credentials)
    ? data.credentials
    : Array.isArray(originalDoc?.credentials)
      ? originalDoc.credentials
      : []

  const sanitized = incoming
    .filter((cred: CredentialInput) => cred && typeof cred === 'object')
    .map((cred: CredentialInput) => ({
      accountName: (cred.accountName || '').toString().trim() || 'Unnamed account',
      active: Boolean(cred.active),
      vercelTeamId: (cred.vercelTeamId || '').toString().trim(),
      vercelToken: (cred.vercelToken || '').toString().trim(),
    }))
    .filter((cred: CredentialInput) => cred.vercelToken)

  if (!sanitized.length && envCredential) {
    sanitized.push(envCredential)
  }

  // Ensure exactly one active credential
  let activeIndex = -1
  for (let i = sanitized.length - 1; i >= 0; i -= 1) {
    if (sanitized[i].active) {
      activeIndex = i
      break
    }
  }
  if (activeIndex === -1 && sanitized.length) {
    activeIndex = 0
  }

  const normalizedCredentials =
    activeIndex === -1
      ? sanitized
      : sanitized.map((cred: CredentialInput, index: number) => ({
          ...cred,
          active: index === activeIndex,
        }))

  return { ...data, credentials: normalizedCredentials }
}

export const tenantSetting: GlobalConfig = {
  slug: 'tenant-setting',
  access: {
    read: () => true,
    update: () => true,
  },
  admin: {
    description:
      'Global tenant settings - manage multiple Vercel credentials with one active entry and toggle the global logger.',
    group: groups.tenant,
  },
  fields: [
    {
      name: 'credentials',
      type: 'array',
      admin: {
        description:
          'Store one or more Vercel accounts. Exactly one credential will be active and used for API calls.',
      },
      defaultValue: () => {
        if (process.env.VERCEL_TOKEN) {
          return [
            {
              accountName: 'Environment default',
              active: true,
              vercelTeamId: process.env.VERCEL_TEAM_ID || '',
              vercelToken: process.env.VERCEL_TOKEN,
            },
          ]
        }
        return []
      },
      fields: [
        {
          name: 'accountName',
          type: 'text',
          admin: {
            description: 'Label to identify this Vercel account',
          },
          required: true,
        },
        {
          name: 'vercelToken',
          type: 'text',
          admin: {
            description: 'Vercel API token for this account',
          },
          required: true,
        },
        {
          name: 'vercelTeamId',
          type: 'text',
          admin: {
            description: 'Optional Vercel team ID for this account',
          },
        },
        {
          name: 'active',
          type: 'checkbox',
          admin: {
            description: 'Set this credential as the active one (others will be deactivated)',
          },
          defaultValue: false,
        },
      ],
      labels: {
        plural: 'Credentials',
        singular: 'Credential',
      },
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
  hooks: {
    beforeChange: [normalizeCredentials],
  },
}
