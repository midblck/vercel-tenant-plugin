import type { PayloadHandler } from 'payload'

// import { getProjectDomains } from './vercelClient' // Unused import
import { getVercelCredentials } from './vercelUtils'
import { logger } from '../utils/logger'
// import { mapVercelDataToTenant } from '../utils/vercelDataMapper' // Unused import
import {
  // createTenantRecord, // Unused import
  fetchVercelProject,
  handleSyncResponse,
  transformProjectData,
  updateTenantRecord,
  validateSyncRequest,
} from '../utils/syncSingleProjectUtils'

// ============================================================================
// VERCEL API FUNCTIONS
// ============================================================================

/**
 * Fetch a single project by ID from Vercel API
 * Uses the direct project endpoint for efficiency
 */
export async function getVercelProjectById(projectId: string, teamId: string, vercelToken: string) {
  try {
    const url = teamId
      ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}`
    const options = {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      method: 'GET',
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        details: errorData,
        error: `Vercel API error: ${response.status} ${response.statusText}`,
        success: false,
      }
    }

    const data = await response.json()
    return {
      data,
      success: true,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error) || 'Unknown error occurred'

    void logger.error('❌ Error in syncSingleProject endpoint', {
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      timestamp: new Date().toISOString(),
    })

    return {
      error: errorMessage,
      success: false,
    }
  }
}

// ============================================================================
// SYNC SINGLE PROJECT ENDPOINT
// ============================================================================

/**
 * Sync single project endpoint - REFACTORED VERSION
 * Now uses extracted utility functions for better maintainability
 */
export const syncSingleProject: PayloadHandler = async (req) => {
  try {
    void logger.info('🚀 syncSingleProject endpoint called', {
      hasPayload: !!req.payload,
      hasUrl: !!req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    })

    const { teamId, vercelToken } = await getVercelCredentials(req.payload)
    const payload = req.payload

    // Validate request parameters
    const validation = validateSyncRequest(req)
    if (validation.error) {
      return Response.json(
        {
          error: validation.error,
          success: false,
        },
        { status: 400 },
      )
    }

    const projectId = validation.projectId

    // Find existing tenant
    const existingTenant = await payload.find({
      collection: 'tenant',
      where: {
        vercelProjectId: {
          equals: projectId,
        },
      },
    })

    if (existingTenant.docs.length === 0) {
      void logger.warn('⚠️ No tenant found for project', {
        projectId,
        timestamp: new Date().toISOString(),
      })
      return Response.json(
        {
          error: `No tenant found with Vercel project ID: ${projectId}`,
          success: false,
        },
        { status: 404 },
      )
    }

    const tenant = existingTenant.docs[0]
    void logger.info('✅ Found tenant for project', {
      projectId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      timestamp: new Date().toISOString(),
    })

    // Fetch project from Vercel API
    void logger.info('🔍 Fetching project from Vercel API', {
      projectId,
      teamId: teamId || 'none',
      timestamp: new Date().toISOString(),
    })

    const projectResult = await fetchVercelProject(projectId, teamId || '', vercelToken)
    if (!projectResult.success || !projectResult.data) {
      void logger.error('❌ Failed to fetch project from Vercel', {
        error: projectResult.error || 'Unknown error',
        projectId,
        timestamp: new Date().toISOString(),
      })
      return Response.json(
        {
          error: projectResult.error || 'Failed to fetch project from Vercel',
          success: false,
        },
        { status: 500 },
      )
    }

    const project = projectResult.data
    void logger.info('✅ Successfully fetched project from Vercel', {
      hasDeployments: !!project.latestDeployments?.length,
      hasEnvironment: !!project.environment,
      hasFramework: !!project.framework,
      projectId,
      projectName: project.name,
      timestamp: new Date().toISOString(),
    })

    // Transform project data
    const transformResult = await transformProjectData(
      project,
      projectId,
      teamId || '',
      vercelToken,
    )
    if (!transformResult.success || !transformResult.data) {
      void logger.error('❌ Failed to transform project data', {
        error: transformResult.error || 'Unknown error',
        projectId,
        timestamp: new Date().toISOString(),
      })
      return Response.json(
        {
          error: transformResult.error || 'Failed to transform project data',
          success: false,
        },
        { status: 500 },
      )
    }

    const transformedData = transformResult.data

    // Update tenant record
    const updateResult = await updateTenantRecord(payload, tenant, transformedData, projectId)
    if (!updateResult.success || !updateResult.data) {
      void logger.error('❌ Failed to update tenant record', {
        error: updateResult.error || 'Unknown error',
        projectId,
        timestamp: new Date().toISOString(),
      })
      return Response.json(
        {
          error: updateResult.error || 'Failed to update tenant record',
          success: false,
        },
        { status: 500 },
      )
    }

    const updatedTenant = updateResult.data

    // Handle success response
    const response = handleSyncResponse(updatedTenant, projectId, project.name, String(tenant.id))

    return Response.json(response, { status: 200 })
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error) || 'Unknown error occurred'

    void logger.error('❌ Unexpected error in syncSingleProject', {
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      timestamp: new Date().toISOString(),
    })

    return Response.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 },
    )
  }
}
