/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vercel } from '@vercel/sdk'

import { logger } from '../utils/logger'
import { createVercelErrorResponse } from '../utils/vercelErrorHandler'
import { createSuccessResponse } from '../utils/responseHandler'
import {
  buildProjectUpdateRequest,
  executeProjectUpdate,
  handleProjectUpdateResponse,
  logFilteredFields,
  validateProjectUpdateData,
} from '../utils/vercelProjectUpdater'
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  GetEnvironmentVariablesResponse,
  GetProjectsResponse,
  VercelClientConfig,
} from '../types'

// ============================================================================
// VERCEL CLIENT HELPERS
// ============================================================================

export const createVercelClient = (config: VercelClientConfig) => {
  const { vercelToken } = config
  if (!vercelToken) {
    throw new Error('Vercel token is required')
  }
  return new Vercel({ bearerToken: vercelToken })
}

export const getVercelProjects = async (
  config: VercelClientConfig,
): Promise<GetProjectsResponse> => {
  try {
    const client = createVercelClient(config)
    const options: { teamId?: string } = {}
    if (config.teamId) {
      options.teamId = config.teamId
    }
    const projects = await client.projects.getProjects(options)

    // Log response structure for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      void logger.debug('Vercel projects response structure', {
        type: typeof projects,
        hasData: projects && typeof projects === 'object' && 'data' in projects,
        hasProjects: projects && typeof projects === 'object' && 'projects' in projects,
      })
    }

    // Handle different response structures from Vercel SDK (it can return an array or an object with a 'data' or 'projects' property)
    let projectsData: any = projects
    if (
      projects &&
      typeof projects === 'object' &&
      'data' in projects &&
      Array.isArray(projects.data)
    ) {
      projectsData = projects.data
    } else if (
      projects &&
      typeof projects === 'object' &&
      'projects' in projects &&
      Array.isArray(projects.projects)
    ) {
      projectsData = projects.projects
    }

    // Log Vercel API response summary and ensure it's an array for consistency
    void logger.info('Vercel projects fetched successfully', {
      count: Array.isArray(projectsData) ? projectsData.length : 0,
    })

    return createSuccessResponse(projectsData) as GetProjectsResponse
  } catch (error) {
    void logger.error('Error fetching Vercel projects', {
      error: error instanceof Error ? error.message : String(error),
    })
    return createVercelErrorResponse(error)
  }
}

export const getProjectDomains = async (
  config: VercelClientConfig,
  projectId: string,
): Promise<{ data: any; error: null | string; success: boolean }> => {
  try {
    const client = createVercelClient(config)
    const options: { teamId?: string } = {}
    if (config.teamId) {
      options.teamId = config.teamId
    }

    const domains = await client.projects.getProjectDomains({
      ...options,
      idOrName: projectId,
    })

    return createSuccessResponse(domains)
  } catch (error) {
    void logger.error(`Error fetching domains for project ${projectId}`, {
      error: error instanceof Error ? error.message : String(error),
      projectId,
    })
    return createVercelErrorResponse(error)
  }
}

export const createVercelProject = async (
  config: VercelClientConfig,
  projectData: CreateProjectRequest,
): Promise<CreateProjectResponse> => {
  try {
    const client = createVercelClient(config)
    const options: { teamId?: string } = {}
    if (config.teamId) {
      options.teamId = config.teamId
    }
    const project = await client.projects.createProject({
      ...options,
      requestBody: {
        name: projectData.name,
        buildCommand: projectData.buildCommand || undefined,
        gitRepository: projectData.gitRepository || undefined,
        installCommand: projectData.installCommand || undefined,
      },
    })
    return createSuccessResponse(project) as CreateProjectResponse
  } catch (error) {
    void logger.error('Error creating Vercel project', {
      error: error instanceof Error ? error.message : String(error),
    })

    return createVercelErrorResponse(error)
  }
}

export const updateVercelProject = async (
  config: VercelClientConfig,
  projectId: string,
  projectData: Partial<CreateProjectRequest>,
): Promise<CreateProjectResponse> => {
  try {
    const client = createVercelClient(config)
    const options: { teamId?: string } = {}
    if (config.teamId) {
      options.teamId = config.teamId
    }
    const project = await client.projects.updateProject({
      ...options,
      idOrName: projectId,
      requestBody: {
        buildCommand: projectData.buildCommand || undefined,
        installCommand: projectData.installCommand || undefined,
      },
    })
    return createSuccessResponse(project) as CreateProjectResponse
  } catch (error) {
    void logger.error('Error updating Vercel project', {
      error: error instanceof Error ? error.message : String(error),
      projectId,
    })

    return createVercelErrorResponse(error)
  }
}

/**
 * Update an existing Vercel project with comprehensive data
 * Maps tenant collection fields to Vercel API fields
 *
 * SUPPORTED FIELDS (can be updated via PATCH):
 * - buildCommand, devCommand, installCommand
 * - outputDirectory, rootDirectory
 * - directoryListing, publicSource
 * - autoAssignCustomDomains, autoExposeSystemEnvs
 * - trustedIps
 *
 * READ-ONLY FIELDS (cannot be updated via PATCH):
 * - live, paused (project status)
 * - features, tier, v0 (project features)
 * - analytics, speedInsights, webAnalytics (analytics settings)
 * - connectBuildsEnabled, connectConfigurationId (deployment settings)
 * - customEnvironments, deploymentExpiration, rollingRelease (deployment config)
 * - gitForkProtection, gitLFS, gitComments, gitProviderOptions (Git settings)
 * - passwordProtection, ssoProtection (security settings)
 * - resourceConfig, defaultResourceConfig (resource configuration)
 */
export const updateVercelProjectComprehensive = async (
  config: VercelClientConfig,
  projectId: string,
  tenantData: any,
): Promise<{ data?: any; error: null | string; success: boolean }> => {
  try {
    const { vercelToken } = config
    const teamId = config.teamId

    // Build URL with teamId parameter if available
    const url = teamId
      ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}`

    void logger.info('🔄 Updating Vercel project with comprehensive data', {
      projectId,
      teamId: teamId || 'none',
      tenantId: tenantData.id,
      tenantName: tenantData.name,
      timestamp: new Date().toISOString(),
    })

    // Validate input data
    void validateProjectUpdateData(tenantData)

    // Build request body
    const requestBody = buildProjectUpdateRequest(tenantData)

    // Log filtered fields for debugging
    void logFilteredFields(tenantData, projectId, requestBody)

    // If no fields to update, return early
    if (Object.keys(requestBody).length === 0) {
      void logger.info('ℹ️ No fields to update in Vercel project', {
        projectId,
        tenantId: tenantData.id,
        timestamp: new Date().toISOString(),
      })
      return createSuccessResponse({ message: 'No fields to update' })
    }

    // Execute the API call
    const result = await executeProjectUpdate(url, requestBody, vercelToken)

    // Handle the response
    return handleProjectUpdateResponse(result, projectId, tenantData, requestBody)
  } catch (error) {
    void logger.error('❌ Error updating Vercel project', {
      error: error instanceof Error ? error.message : String(error),
      projectId,
      tenantId: tenantData?.id,
      tenantName: tenantData?.name,
      timestamp: new Date().toISOString(),
    })

    return createVercelErrorResponse(error)
  }
}

export const updateProjectCrons = async (
  config: VercelClientConfig,
  projectId: string,
  enabled: boolean,
): Promise<{ error: null | string; success: boolean }> => {
  try {
    const { vercelToken } = config
    const teamId = config.teamId

    // Build URL with teamId parameter if available
    const url = `https://vercel.com/api/v1/projects/${projectId}/crons${teamId ? `?teamId=${teamId}` : ''}`

    void logger.info(`${enabled ? 'Enabling' : 'Disabling'} crons for project ${projectId}`, {
      enabled,
      projectId,
    })

    const response = await fetch(url, {
      body: JSON.stringify({ enabled }),
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      method: 'PATCH',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    void logger.info(
      `Successfully ${enabled ? 'enabled' : 'disabled'} crons for project ${projectId}`,
      {
        enabled,
        projectId,
      },
    )

    return createSuccessResponse(result)
  } catch (error) {
    void logger.error(`Error updating crons for project ${projectId}`, {
      error: error instanceof Error ? error.message : String(error),
      projectId,
    })
    return createVercelErrorResponse(error)
  }
}

export const deleteVercelProject = async (
  config: VercelClientConfig,
  projectId: string,
): Promise<{ error: null | string; success: boolean }> => {
  try {
    const client = createVercelClient(config)
    const options: { teamId?: string } = {}
    if (config.teamId) {
      options.teamId = config.teamId
    }

    await client.projects.deleteProject({
      ...options,
      idOrName: projectId,
    })

    return createSuccessResponse(null)
  } catch (error) {
    void logger.error('Error deleting Vercel project', {
      error: error instanceof Error ? error.message : String(error),
      projectId,
    })
    return createVercelErrorResponse(error)
  }
}

// Pause/unpause functionality removed - requires Vercel billing to be enabled
// These endpoints are not available without a paid Vercel account

export const getProjectEnvironmentVariables = async (
  config: VercelClientConfig,
  projectId: string,
  options?: {
    decrypt?: boolean
    environment?: 'development' | 'preview' | 'production'
    gitBranch?: string
  },
): Promise<GetEnvironmentVariablesResponse> => {
  try {
    const client = createVercelClient(config)
    const vercelOptions: {
      decrypt?: 'false' | 'true'
      gitBranch?: string
      idOrName: string
      teamId?: string
    } = {
      idOrName: projectId,
    }

    if (config.teamId) {
      vercelOptions.teamId = config.teamId
    }

    if (options?.gitBranch) {
      vercelOptions.gitBranch = options.gitBranch
    }

    if (options?.decrypt !== undefined) {
      vercelOptions.decrypt = options.decrypt ? 'true' : 'false'
    }

    const envVars = await client.projects.filterProjectEnvs(vercelOptions)

    // Handle the response which can be an array or an object with data property
    const envVarsArray = Array.isArray(envVars) ? envVars : (envVars as any).data || []

    // Log environment variables fetch result
    void logger.info(
      `Fetched ${envVarsArray.length} environment variables for project ${projectId}`,
      {
        count: envVarsArray.length,
        projectId,
      },
    )

    return createSuccessResponse(envVarsArray)
  } catch (error) {
    void logger.error(`Error fetching environment variables for project ${projectId}`, {
      error: error instanceof Error ? error.message : String(error),
      projectId,
    })
    return createVercelErrorResponse(error)
  }
}
