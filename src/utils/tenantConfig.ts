import type { Payload } from 'payload'

import { logger } from './logger'

/**
 * Configuration interface for tenant settings
 */
export interface TenantConfig {
  loggerEnabled: boolean
  vercelTeamId: string
  vercelToken: string
}

interface CredentialCandidate {
  accountName?: string
  active?: boolean
  vercelTeamId?: string
  vercelToken?: string
}

const envCredential = () => ({
  vercelTeamId: process.env.VERCEL_TEAM_ID || '',
  vercelToken: process.env.VERCEL_TOKEN || '',
})

const pickActiveCredential = (globalSettings: any): CredentialCandidate | null => {
  const credentials = Array.isArray(globalSettings?.credentials) ? globalSettings.credentials : []

  if (!credentials.length) {
    return null
  }

  const sanitized = credentials
    .filter((cred: CredentialCandidate) => cred && typeof cred === 'object')
    .map((cred: CredentialCandidate) => ({
      accountName: (cred.accountName || '').toString().trim(),
      active: Boolean(cred.active),
      vercelTeamId: (cred.vercelTeamId || '').toString().trim(),
      vercelToken: (cred.vercelToken || '').toString().trim(),
    }))
    .filter((cred: CredentialCandidate) => cred.vercelToken)

  if (!sanitized.length) {
    return null
  }

  let activeIndex = -1
  for (let i = sanitized.length - 1; i >= 0; i -= 1) {
    if (sanitized[i].active) {
      activeIndex = i
      break
    }
  }

  if (activeIndex === -1) {
    activeIndex = 0
  }

  return sanitized[activeIndex]
}

/**
 * Get global configuration from TenantSetting collection with environment fallback
 */
export async function getGlobalConfig(payload: Payload): Promise<TenantConfig> {
  const env = envCredential()

  try {
    // Try to get from TenantSetting global
    const globalSettings = await payload.findGlobal({
      slug: 'tenant-setting',
    })

    if (globalSettings) {
      const activeCredential = pickActiveCredential(globalSettings)

      const vercelToken =
        activeCredential?.vercelToken ||
        globalSettings.vercelToken ||
        globalSettings.VERCEL_TOKEN ||
        env.vercelToken

      const vercelTeamId =
        activeCredential?.vercelTeamId ||
        globalSettings.vercelTeamId ||
        globalSettings.VERCEL_TEAM_ID ||
        env.vercelTeamId

      return {
        loggerEnabled: globalSettings.loggerEnabled ?? process.env.LOGGER_ENABLED === 'true',
        vercelTeamId,
        vercelToken,
      }
    }
  } catch (error) {
    // If global doesn't exist or error occurs, fall back to environment
    void logger.warn('Failed to load global tenant settings, using environment variables:', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Fallback to environment variables
  return {
    loggerEnabled: process.env.LOGGER_ENABLED === 'true',
    vercelTeamId: env.vercelTeamId,
    vercelToken: env.vercelToken,
  }
}

/**
 * Get tenant-specific configuration with fallback to global settings
 * @param tenantId - The tenant ID to get configuration for
 * @param payload - Payload instance
 * @returns Tenant configuration with fallback logic
 */
export async function getTenantConfig(tenantId: string, payload: Payload): Promise<TenantConfig> {
  try {
    // Get tenant data
    const tenant = await payload.findByID({
      id: tenantId,
      collection: 'tenant',
    })

    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`)
    }

    // Get global settings as fallback
    const globalConfig = await getGlobalConfig(payload)

    // Check for tenant overrides first, then fall back to global settings
    return {
      loggerEnabled: globalConfig.loggerEnabled, // Logger is global only
      vercelTeamId: tenant.vercelTeamIdOverride || globalConfig.vercelTeamId,
      vercelToken: tenant.vercelTokenOverride || globalConfig.vercelToken,
    }
  } catch (error) {
    void logger.warn(`Failed to load tenant config for ${tenantId}, using global settings:`, {
      error: error instanceof Error ? error.message : String(error),
      tenantId,
    })
    // Fall back to global settings if tenant lookup fails
    return await getGlobalConfig(payload)
  }
}

/**
 * Get configuration for a specific tenant or global if no tenant ID provided
 * @param payload - Payload instance
 * @param tenantId - Optional tenant ID
 * @returns Configuration object
 */
export async function getConfig(payload: Payload, tenantId?: string): Promise<TenantConfig> {
  if (tenantId) {
    return await getTenantConfig(tenantId, payload)
  }
  return await getGlobalConfig(payload)
}
