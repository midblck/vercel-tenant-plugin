// ============================================================================
// VERCEL PROJECT UPDATE UTILITIES
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
// import type { VercelClientConfig } from '../types' // Unused import

// import { createVercelErrorResponse } from './vercelErrorHandler' // Unused import
import { createSuccessResponse } from './responseHandler'
import { logger } from './logger'

/**
 * Validates project update data and extracts relevant fields
 */
export function validateProjectUpdateData(tenantData: any): void {
  if (!tenantData || typeof tenantData !== 'object') {
    throw new Error('Invalid tenant data provided')
  }

  if (!tenantData.id) {
    throw new Error('Tenant ID is required for project updates')
  }
}

/**
 * Builds the request body for Vercel project update API
 * Maps tenant fields to Vercel API fields based on documentation
 */
export function buildProjectUpdateRequest(tenantData: any): any {
  const requestBody: any = {}

  // Basic project configuration
  if (tenantData.buildCommand !== undefined) {
    requestBody.buildCommand = tenantData.buildCommand
  }
  if (tenantData.devCommand !== undefined) {
    requestBody.devCommand = tenantData.devCommand
  }
  if (tenantData.installCommand !== undefined) {
    requestBody.installCommand = tenantData.installCommand
  }
  if (tenantData.outputDirectory !== undefined) {
    requestBody.outputDirectory = tenantData.outputDirectory
  }
  if (tenantData.rootDirectory !== undefined) {
    requestBody.rootDirectory = tenantData.rootDirectory
  }

  // Project settings and features
  if (tenantData.directoryListing !== undefined) {
    requestBody.directoryListing = tenantData.directoryListing
  }
  if (tenantData.publicSource !== undefined) {
    requestBody.publicSource = tenantData.publicSource
  }

  // Environment and deployment settings
  if (tenantData.autoAssignCustomDomains !== undefined) {
    requestBody.autoAssignCustomDomains = tenantData.autoAssignCustomDomains
  }
  if (tenantData.autoExposeSystemEnvs !== undefined) {
    requestBody.autoExposeSystemEnvs = tenantData.autoExposeSystemEnvs
  }

  // Trusted IPs for security
  if (tenantData.trustedIps !== undefined) {
    requestBody.trustedIps = tenantData.trustedIps
  }

  return requestBody
}

/**
 * Executes the Vercel project update API call
 */
export async function executeProjectUpdate(
  url: string,
  requestBody: any,
  vercelToken: string,
): Promise<any> {
  const response = await fetch(url, {
    body: JSON.stringify(requestBody),
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: 'PATCH',
  })

  if (!response.ok) {
    const errorText = await response.text()
    const errorMessage = `HTTP ${response.status}: ${errorText}`
    throw new Error(errorMessage)
  }

  return await response.json()
}

/**
 * Handles the project update response and logging
 */
export function handleProjectUpdateResponse(
  result: any,
  projectId: string,
  tenantData: any,
  requestBody: any,
): any {
  logger.info('✅ Successfully updated Vercel project', {
    projectId,
    tenantId: tenantData.id,
    tenantName: tenantData.name,
    timestamp: new Date().toISOString(),
    updatedFields: Object.keys(requestBody),
  })

  return createSuccessResponse(result)
}

/**
 * Logs filtered out fields for debugging
 */
export function logFilteredFields(tenantData: any, projectId: string, requestBody: any): void {
  const filteredOutFields = [
    'analytics',
    'speedInsights',
    'webAnalytics', // Read-only analytics
    'live',
    'paused', // Read-only status fields
    'features',
    'tier',
    'v0', // Read-only project features
    'connectBuildsEnabled',
    'connectConfigurationId', // Advanced deployment settings
    'customEnvironments',
    'deploymentExpiration',
    'rollingRelease', // Deployment config
    'defaultResourceConfig',
    'resourceConfig', // Read-only resource config
    'gitForkProtection',
    'gitLFS',
    'gitComments',
    'gitProviderOptions', // Read-only Git settings
    'passwordProtection',
    'ssoProtection', // Read-only security settings
  ].filter((field) => tenantData[field] !== undefined)

  logger.debug('📤 Request body for Vercel project update', {
    filteredOutFields,
    projectId,
    requestBodyKeys: Object.keys(requestBody),
    requestBodySize: JSON.stringify(requestBody).length,
    timestamp: new Date().toISOString(),
  })
}
