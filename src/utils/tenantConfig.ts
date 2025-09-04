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

/**
 * Get global configuration from TenantSetting collection with environment fallback
 */
export async function getGlobalConfig(payload: Payload): Promise<TenantConfig> {
  try {
    // Try to get from TenantSetting global
    const globalSettings = await payload.findGlobal({
      slug: 'tenant-setting',
    })

    if (globalSettings) {
      return {
        loggerEnabled: globalSettings.loggerEnabled ?? process.env.LOGGER_ENABLED === 'true',
        vercelTeamId: globalSettings.vercelTeamId || process.env.VERCEL_TEAM_ID || '',
        vercelToken: globalSettings.vercelToken || process.env.VERCEL_TOKEN || '',
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
    vercelTeamId: process.env.VERCEL_TEAM_ID || '',
    vercelToken: process.env.VERCEL_TOKEN || '',
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
