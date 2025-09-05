/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vercel } from '@vercel/sdk'
import type { Payload } from 'payload'

import type { TransformedVercelProject } from '../types'
import { getConfig, getTenantConfig, getGlobalConfig } from '../utils/tenantConfig'
import { logger } from '../utils/logger'

// ============================================================================
// CREDENTIAL CACHING
// ============================================================================

interface CachedCredentials {
  vercel: Vercel
  teamId: string
  vercelToken: string
  source: string
  isValid: boolean
  lastValidated: number
}

const credentialCache = new Map<string, CachedCredentials>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getVercelCredentials = async (payload: Payload, tenantId?: string) => {
  // Get configuration using new tenant config system
  const config = await getConfig(payload, tenantId)
  const { vercelTeamId, vercelToken } = config

  if (!vercelToken) {
    throw new Error(
      'Vercel token not configured. Please set VERCEL_TOKEN environment variable, configure global tenant settings, or set tenant override.',
    )
  }

  // Create Vercel SDK instance
  const vercel = new Vercel({
    bearerToken: vercelToken,
  })

  return { teamId: vercelTeamId, vercel, vercelToken }
}

// ============================================================================
// ENHANCED CREDENTIAL FUNCTIONS
// ============================================================================

export const createVercelInstance = (token: string, teamId: string, source: string) => {
  const vercel = new Vercel({
    bearerToken: token,
  })

  return { vercel, teamId, source }
}

export const validateVercelCredentials = async (
  vercel: Vercel,
  teamId: string,
  projectId: string,
) => {
  try {
    // Test credentials by getting deployments (simpler API call)
    await vercel.deployments.getDeployments({ limit: 1, projectId, teamId })
    return { isValid: true, error: null, testResult: 'success' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    let testResult = 'unknown'

    if (errorMessage.includes('Project not found')) {
      testResult = 'project-not-found'
    } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
      testResult = 'unauthorized'
    } else if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
      testResult = 'forbidden'
    }

    return { isValid: false, error: errorMessage, testResult }
  }
}

export const getTenantVercelCredentials = async (payload: Payload, tenantId: string) => {
  // Check cache first
  const cached = credentialCache.get(tenantId)
  if (cached && Date.now() - cached.lastValidated < CACHE_DURATION) {
    void logger.debug(`Using cached credentials for tenant ${tenantId}`, {
      source: cached.source,
      isValid: cached.isValid,
    })
    return cached
  }

  try {
    // Get tenant data
    const tenant = await payload.findByID({ id: tenantId, collection: 'tenant' })
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`)
    }

    // Check for tenant overrides first
    if (tenant.vercelTokenOverride && tenant.vercelTeamIdOverride) {
      void logger.info(`Using tenant override credentials for ${tenant.name}`, {
        tenantId,
        hasTokenOverride: !!tenant.vercelTokenOverride,
        hasTeamOverride: !!tenant.vercelTeamIdOverride,
        tokenPreview: tenant.vercelTokenOverride.substring(0, 8) + '...',
      })

      const credentials = createVercelInstance(
        tenant.vercelTokenOverride,
        tenant.vercelTeamIdOverride,
        'tenant-override',
      )

      // Validate credentials if project exists
      if (tenant.vercelProjectId) {
        const validation = await validateVercelCredentials(
          credentials.vercel,
          credentials.teamId,
          tenant.vercelProjectId,
        )

        if (validation.isValid) {
          const result = {
            ...credentials,
            vercelToken: tenant.vercelTokenOverride,
            isValid: true,
            lastValidated: Date.now(),
          }
          credentialCache.set(tenantId, result)
          return result
        } else {
          void logger.warn(
            `Tenant override validation failed for ${tenant.name}, falling back to tenant setting`,
            {
              tenantId,
              error: validation.error,
              testResult: validation.testResult,
            },
          )
        }
      } else {
        // No project to validate against, assume valid
        const result = {
          ...credentials,
          vercelToken: tenant.vercelTokenOverride,
          isValid: true,
          lastValidated: Date.now(),
        }
        credentialCache.set(tenantId, result)
        return result
      }
    }

    // Fall back to tenant setting (global config)
    void logger.info(`Using tenant setting credentials for ${tenant.name}`, {
      tenantId,
      hasTokenOverride: false,
      hasTeamOverride: false,
    })

    const config = await getTenantConfig(tenantId, payload)
    const credentials = createVercelInstance(
      config.vercelToken,
      config.vercelTeamId,
      'tenant-setting',
    )

    // Validate credentials if project exists
    if (tenant.vercelProjectId) {
      const validation = await validateVercelCredentials(
        credentials.vercel,
        credentials.teamId,
        tenant.vercelProjectId,
      )

      if (validation.isValid) {
        const result = {
          ...credentials,
          vercelToken: config.vercelToken,
          isValid: true,
          lastValidated: Date.now(),
        }
        credentialCache.set(tenantId, result)
        return result
      } else {
        void logger.warn(
          `Tenant setting validation failed for ${tenant.name}, falling back to environment`,
          {
            tenantId,
            error: validation.error,
            testResult: validation.testResult,
          },
        )
      }
    }

    // Fall back to environment variables
    void logger.info(`Using environment credentials for ${tenant.name}`, {
      tenantId,
      source: 'environment',
    })

    const globalConfig = await getGlobalConfig(payload)
    const envCredentials = createVercelInstance(
      globalConfig.vercelToken,
      globalConfig.vercelTeamId,
      'environment',
    )

    // Final validation
    if (tenant.vercelProjectId) {
      const validation = await validateVercelCredentials(
        envCredentials.vercel,
        envCredentials.teamId,
        tenant.vercelProjectId,
      )

      if (!validation.isValid) {
        void logger.error(`All credential sources failed for tenant ${tenant.name}`, {
          tenantId,
          error: validation.error,
          testResult: validation.testResult,
        })
        throw new Error(`All credential sources failed: ${validation.error}`)
      }
    }

    const result = {
      ...envCredentials,
      vercelToken: globalConfig.vercelToken,
      isValid: true,
      lastValidated: Date.now(),
    }
    credentialCache.set(tenantId, result)
    return result
  } catch (error) {
    void logger.error(`Failed to get credentials for tenant ${tenantId}`, {
      tenantId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export const getVercelCredentialsForTenant = async (payload: Payload, tenantId?: string) => {
  if (!tenantId) {
    // No tenant ID - use global credentials (current behavior)
    const globalCreds = await getVercelCredentials(payload)
    return {
      ...globalCreds,
      source: 'global',
      isValid: true,
    }
  }

  try {
    // Check if tenant has overrides
    const tenant = await payload.findByID({ id: tenantId, collection: 'tenant' })
    const hasOverrides = tenant?.vercelTokenOverride && tenant?.vercelTeamIdOverride

    if (hasOverrides) {
      // Use tenant-specific credentials
      return await getTenantVercelCredentials(payload, tenantId)
    } else {
      // Use global credentials (current behavior)
      const globalCreds = await getVercelCredentials(payload)
      return {
        ...globalCreds,
        source: 'global',
        isValid: true,
      }
    }
  } catch (error) {
    void logger.warn(
      `Failed to get tenant-specific credentials for ${tenantId}, falling back to global`,
      {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      },
    )
    // Fall back to global credentials
    const globalCreds = await getVercelCredentials(payload)
    return {
      ...globalCreds,
      source: 'global',
      isValid: true,
    }
  }
}

export const transformVercelProject = (project: any): TransformedVercelProject => {
  // Determine the correct project URL based on domains and project data
  let projectUrl = ''

  if (project.domains && project.domains.length > 0) {
    // Use the first verified domain, or first domain if none verified
    const verifiedDomain = project.domains.find((domain: any) => domain.verified)
    projectUrl = verifiedDomain
      ? `https://${verifiedDomain.name}`
      : `https://${project.domains[0].name}`
  } else if (project.url) {
    // Use the project URL if available
    projectUrl = project.url
  } else {
    // Fallback to default vercel.app URL
    projectUrl = `https://${project.name}.vercel.app`
  }

  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    crons:
      project.crons && typeof project.crons === 'object'
        ? {
            definitions:
              project.crons.definitions && Array.isArray(project.crons.definitions)
                ? project.crons.definitions.map((def: any) => ({
                    host: def && typeof def === 'object' ? def.host || null : null,
                    path: def && typeof def === 'object' ? def.path || null : null,
                    schedule: def && typeof def === 'object' ? def.schedule || null : null,
                  }))
                : [],
            deploymentId: project.crons.deploymentId || null,
            disabledAt: project.crons.disabledAt || null,
            enabledAt: project.crons.enabledAt || null,
            updatedAt: project.crons.updatedAt || null,
          }
        : null,
    domains: project.domains || [],
    environment: project.environment || 'production',
    framework: project.framework,
    gitRepository: project.link
      ? {
          type: project.link.type,
          branch: project.link.productionBranch,
          owner: project.link.org,
          repo: project.link.repo,
          repoId: project.link.repoId,
          repoOwnerId: project.link.repoOwnerId,
        }
      : null,
    status: project.latestDeployments?.[0]?.readyState || 'unknown',
    teamId: project.teamId,
    updatedAt: project.updatedAt,
    url: projectUrl,
  }
}
