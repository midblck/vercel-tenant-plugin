// ============================================================================
// SYNC SINGLE PROJECT UTILITIES
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Payload, PayloadRequest } from 'payload'

import { getProjectDomains } from '../endpoints/vercelClient'
import type { EnhancedVercelProject } from '../types'

import { logger } from './logger'
import { mapVercelDataToTenant } from './vercelDataMapper'
import { createSuccessResponse } from './responseHandler'

/**
 * Validates the sync request parameters
 */
export function validateSyncRequest(
  req: { body?: { projectId?: string }; url?: string } | PayloadRequest,
): {
  error?: string
  projectId: string
} {
  const url = req.url ? new URL(req.url) : null
  // Handle both PayloadRequest and simple request objects
  const bodyProjectId =
    req.body && typeof req.body === 'object' && 'projectId' in req.body
      ? (req.body as any).projectId
      : undefined
  const projectId = url?.searchParams.get('projectId') || bodyProjectId

  if (!projectId) {
    return {
      error: 'ProjectId is required as query parameter or in request body',
      projectId: '',
    }
  }

  return { projectId }
}

/**
 * Fetches a single project by ID from Vercel API
 * Uses the direct project endpoint for efficiency
 */
export async function fetchVercelProject(
  projectId: string,
  teamId: string,
  vercelToken: string,
): Promise<{ data?: EnhancedVercelProject; error?: string; success: boolean }> {
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
      const _errorData = await response.json().catch(() => ({}))
      return {
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
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false,
    }
  }
}

/**
 * Transforms project data and domains into tenant data
 */
export async function transformProjectData(
  project: EnhancedVercelProject,
  projectId: string,
  teamId: string,
  vercelToken: string,
): Promise<{ data?: any; error?: string; success: boolean }> {
  try {
    // Get project domains
    const domainsResult = await getProjectDomains({ teamId, vercelToken }, projectId)

    if (!domainsResult.success) {
      return {
        error: `Failed to fetch domains: ${domainsResult.error}`,
        success: false,
      }
    }

    // Ensure domainsArray is always an array
    let domainsArray = []
    if (domainsResult.data) {
      if (Array.isArray(domainsResult.data)) {
        domainsArray = domainsResult.data
      } else if (domainsResult.data.domains && Array.isArray(domainsResult.data.domains)) {
        domainsArray = domainsResult.data.domains
      } else if (domainsResult.data.data && Array.isArray(domainsResult.data.data)) {
        domainsArray = domainsResult.data.data
      }
    }

    // Map Vercel data to tenant format
    const transformedData = mapVercelDataToTenant(project, domainsArray)

    return {
      data: transformedData,
      success: true,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error) || 'Unknown error occurred'

    void logger.error('❌ Error in transformProjectData', {
      error: errorMessage,
      errorType: typeof error,
      projectId,
      timestamp: new Date().toISOString(),
    })

    return {
      error: errorMessage,
      success: false,
    }
  }
}

/**
 * Updates an existing tenant record with new data
 */
export async function updateTenantRecord(
  payload: Payload,
  tenant: any,
  transformedData: any,
  projectId: string,
): Promise<{ data?: any; error?: string; success: boolean }> {
  try {
    const updateData = {
      ...transformedData,
      lastSynced: new Date().toISOString(),
      lastSyncMessage: `✅ Project synced successfully`,
      lastSyncStatus: 'synced',
    }

    const updatedTenant = await payload.update({
      id: tenant.id,
      collection: 'tenant',
      data: updateData,
    })

    void logger.info('✅ Successfully updated tenant record', {
      projectId,
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
    })

    return {
      data: updatedTenant,
      success: true,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false,
    }
  }
}

/**
 * Creates a new tenant record from project data
 */
export async function createTenantRecord(
  payload: Payload,
  project: EnhancedVercelProject,
  transformedData: any,
  projectId: string,
): Promise<{ data?: any; error?: string; success: boolean }> {
  try {
    const newTenantData = {
      name: project.name || `Project ${projectId}`,
      vercelProjectId: projectId,
      ...transformedData,
      isActive: true,
      lastSynced: new Date().toISOString(),
      lastSyncMessage: `✅ New tenant created from Vercel project`,
      lastSyncStatus: 'synced',
      status: 'approved',
    }

    const newTenant = await payload.create({
      collection: 'tenant',
      data: newTenantData,
    })

    void logger.info('✅ Successfully created new tenant record', {
      projectId,
      tenantId: newTenant.id,
      timestamp: new Date().toISOString(),
    })

    return {
      data: newTenant,
      success: true,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false,
    }
  }
}

/**
 * Handles the sync response and logging
 */
export function handleSyncResponse(
  result: any,
  projectId: string,
  projectName: string,
  tenantId?: string,
): { data: any; error: null | string; success: boolean; timestamp: string } {
  void logger.info('🎉 Sync completed successfully', {
    projectId,
    projectName,
    tenantId,
    timestamp: new Date().toISOString(),
  })

  return createSuccessResponse({
    data: result,
    message: 'Project synced successfully',
    projectId,
    projectName,
    tenantId,
  })
}
