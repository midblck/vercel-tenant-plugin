/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
} from 'payload'

import { updateProjectCrons } from '../endpoints/vercelClient'
import { getVercelCredentials } from '../endpoints/vercelUtils'
import { logger } from '../utils/logger'

// Utility function to generate Vercel project URL (fallback) - REMOVED
// Always use the actual vercelProjectUrl field for data reliability

// Hook to update vercelProjectUrl based on project name (fallback) - RE-ENABLED
// Now uses proper domain priority logic for data reliability
export const updateProjectUrlHook: CollectionBeforeChangeHook = ({
  data,
  operation: _operation,
  originalDoc: _originalDoc,
  req: _req,
}) => {
  // Only update vercelProjectUrl if we have project name but no URL
  if (
    (_operation === 'update' || _operation === 'create') &&
    data?.vercelProjectName &&
    !data?.vercelProjectUrl &&
    !data?.vercelProjectDomains?.length
  ) {
    // Generate fallback URL using project name (this is safe now since we have proper domain logic elsewhere)
    const url = `https://${data.vercelProjectName}.vercel.app`
    // Fallback URL set for tenant
    data.vercelProjectUrl = url
  } else {
    // Using existing vercelProjectUrl
  }
}

// Pause/unpause hook removed - functionality requires Vercel billing

// ============================================================================
// CRON MANAGEMENT HOOKS
// ============================================================================

export const beforeChangeCronHook: CollectionBeforeChangeHook = ({
  data,
  operation: _operation,
  originalDoc,
}) => {
  // Store the original disableCron state for comparison in afterChange
  if (originalDoc) {
    data._originalDisableCron = originalDoc.disableCron
  }

  return data
}

export const afterChangeCronHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  try {
    // Only process if tenant has a Vercel project ID
    if (!doc.vercelProjectId) {
      return doc
    }

    // Check if disableCron field changed
    const previousDisableCron = operation === 'update' ? previousDoc?.disableCron : false
    const currentDisableCron = doc.disableCron || false

    // Only update if the disableCron field actually changed
    if (previousDisableCron === currentDisableCron) {
      return doc
    }

    // Get Vercel credentials
    const { teamId, vercelToken } = getVercelCredentials()

    // Update cron status in Vercel (enabled = !currentDisableCron)
    await updateProjectCrons(
      { teamId, vercelToken },
      doc.vercelProjectId,
      !currentDisableCron, // enabled = opposite of disableCron
    )

    // Store success/error info in request for frontend access
    if (req) {
      ;(req as any).cronUpdateResult = {
        cronStatus: currentDisableCron ? 'disabled' : 'enabled',
        message: currentDisableCron
          ? `✅ Cron jobs disabled for tenant "${doc.name}"`
          : `✅ Cron jobs enabled for tenant "${doc.name}"`,
        success: true,
        tenantId: doc.id,
        tenantName: doc.name,
        timestamp: new Date().toISOString(),
        vercelProjectId: doc.vercelProjectId,
      }
    }
  } catch (error) {
    // Store error info in request for frontend access
    if (req) {
      ;(req as any).cronUpdateResult = {
        cronStatus: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `❌ Failed to update cron status for tenant "${doc.name}"`,
        success: false,
        tenantId: doc.id,
        tenantName: doc.name,
        timestamp: new Date().toISOString(),
        vercelProjectId: doc.vercelProjectId,
      }
    }
  }

  return doc
}

// NEW: Hook to sync tenant updates TO Vercel
export const syncTenantToVercelHook: CollectionAfterChangeHook = ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  // Only sync TO Vercel if tenant has a Vercel project ID and this is an update operation
  if (!doc.vercelProjectId || operation !== 'update' || !previousDoc) {
    return doc
  }

  // Skip if this update was triggered by a Vercel sync to avoid infinite loops
  if (doc.lastSynced && new Date().getTime() - new Date(doc.lastSynced).getTime() < 5000) {
    // 5 second buffer for Vercel sync operations
    return doc
  }

  // Check if any Vercel-relevant fields have changed
  const vercelRelevantFields = [
    'name',
    'buildCommand',
    'devCommand',
    'installCommand',
    'outputDirectory',
    'rootDirectory',
    'vercelProjectFramework',
    'directoryListing',
    'publicSource',
    'gitForkProtection',
    'gitLFS',
    'gitComments',
    'gitProviderOptions',
    'passwordProtection',
    'ssoProtection',
    'analytics',
    'speedInsights',
    'webAnalytics',
    'resourceConfig',
    'customEnvironments',
    'connectConfigurationId',
    'connectBuildsEnabled',
    'autoExposeSystemEnvs',
    'autoAssignCustomDomains',
    'deploymentExpiration',
    'rollingRelease',
    'features',
    'tier',
    'v0',
    'live',
    'paused',
  ]

  const hasVercelRelevantChanges = vercelRelevantFields.some((field) => {
    const currentValue = doc[field]
    const previousValue = previousDoc[field]

    // Deep comparison for objects
    if (typeof currentValue === 'object' && typeof previousValue === 'object') {
      return JSON.stringify(currentValue) !== JSON.stringify(previousValue)
    }

    return currentValue !== previousValue
  })

  if (!hasVercelRelevantChanges) {
    return doc
  }

  logger.info(
    `Tenant ${doc.name} has Vercel-relevant changes, syncing to Vercel project ${doc.vercelProjectId}`,
  )

  // Schedule Vercel update to run after current operation completes
  setTimeout(async () => {
    try {
      const { updateVercelProjectComprehensive } = await import('../endpoints/vercelClient')
      const { getVercelCredentials } = await import('../endpoints/vercelUtils')

      const { teamId, vercelToken } = getVercelCredentials()

      if (!vercelToken) {
        logger.error('Vercel token not found, cannot update Vercel project', {
          projectId: doc.vercelProjectId,
          tenantName: doc.name,
        })
        return
      }

      const updateResult = await updateVercelProjectComprehensive(
        { teamId, vercelToken },
        doc.vercelProjectId,
        doc,
      )

      if (updateResult.success) {
        logger.info(
          `Successfully synced tenant ${doc.name} changes to Vercel project ${doc.vercelProjectId}`,
        )

        // Update the tenant's lastSynced timestamp to prevent infinite loops
        try {
          await req.payload.update({
            id: doc.id,
            collection: 'tenant',
            data: {
              lastSynced: new Date().toISOString(),
              lastVercelUpdate: new Date().toISOString(),
            },
          })
        } catch (updateError) {
          logger.warn(`Failed to update lastSynced timestamp for tenant ${doc.name}`, {
            error: updateError instanceof Error ? updateError.message : String(updateError),
          })
        }
      } else {
        logger.error(
          `Failed to sync tenant ${doc.name} changes to Vercel project ${doc.vercelProjectId}`,
          {
            error: updateResult.error,
            projectId: doc.vercelProjectId,
          },
        )
      }
    } catch (error) {
      logger.error(`Error during Vercel project update for tenant ${doc.name}`, {
        error: error instanceof Error ? error.message : String(error),
        projectId: doc.vercelProjectId,
      })
    }
  }, 2000) // 2 second delay to ensure current operation completes

  return doc
}

// ============================================================================
// MAIN TENANT HOOKS
// ============================================================================

export const tenantAfterChangeHook: CollectionAfterChangeHook = async ({
  doc: _doc,
  operation: _operation,
  req: _req,
}) => {
  // This hook is now simplified - Vercel project creation is handled in beforeChange
  // to avoid write conflicts during tenant creation
}

export const tenantBeforeChangeHook: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  // Handle new tenant creation with approved status
  if (operation === 'create' && data?.status === 'approved' && !data?.vercelProjectId) {
    try {
      // Get Vercel credentials using utility function
      const { teamId, vercelToken } = getVercelCredentials()

      logger.info(`Creating Vercel project for tenant "${data.name}"`, { tenantName: data.name })

      // Create Vercel project FIRST
      const { createVercelProject } = await import('../endpoints/vercelClient')

      const vercelResult = await createVercelProject(
        { teamId, vercelToken },
        {
          name: data.name,
          buildCommand: 'pnpm build:prod',
          gitRepository: data.vercelProjectGitRepository
            ? {
                type: data.vercelProjectGitRepository.type,
                repo: `${data.vercelProjectGitRepository.owner}/${data.vercelProjectGitRepository.repo}`,
              }
            : undefined,
          installCommand: 'pnpm install',
        },
      )

      // Check Vercel project creation result
      if (!vercelResult.success || !vercelResult.data) {
        logger.error(`Vercel project creation failed for "${data.name}"`, {
          error: vercelResult.error,
          tenantName: data.name,
        })

        // CRITICAL: If Vercel project creation fails, prevent tenant creation
        // This maintains consistency with the createTenant endpoint behavior
        // Use APIError like the deletion hook for better frontend display
        const { APIError } = await import('payload')
        const errorMessage = `VERCEL PROJECT CREATION FAILED: ${vercelResult.error || 'Unknown error'}`
        throw new APIError(errorMessage, 400)
      }

      const vercelProject = vercelResult.data
      logger.info(`Vercel project created successfully: ${vercelProject.id}`, {
        projectId: vercelProject.id,
        tenantName: data.name,
      })

      // Only set Vercel project data if creation was successful
      data.vercelProjectId = vercelProject.id
      data.vercelProjectName = vercelProject.name
      data.vercelProjectStatus = 'ready'
      data.vercelProjectFramework = vercelProject.framework || 'nextjs'
      data.vercelProjectUrl = vercelProject.url || ''
      data.vercelProjectCreatedAt = vercelProject.createdAt
        ? new Date(vercelProject.createdAt).toISOString()
        : new Date().toISOString()
      data.vercelProjectUpdatedAt = vercelProject.updatedAt
        ? new Date(vercelProject.updatedAt).toISOString()
        : new Date().toISOString()
      data.lastSynced = new Date().toISOString()

      logger.info(`Tenant "${data.name}" will be created with Vercel project ${vercelProject.id}`, {
        projectId: vercelProject.id,
        tenantName: data.name,
      })
    } catch (error) {
      logger.error(
        `Error creating Vercel project for tenant "${data.name}"`,
        {
          tenantName: data.name,
        },
        error as Error,
      )

      // CRITICAL: Re-throw the error to prevent tenant creation
      // This ensures no tenant is created without a successful Vercel project
      if (error instanceof Error && error.message.includes('ValidationError')) {
        // Re-throw ValidationError as-is
        throw error
      } else {
        // Use APIError like the deletion hook for better frontend display
        // Check if error already has our custom prefix to avoid duplication
        const { APIError } = await import('payload')
        const baseMessage =
          error instanceof Error ? error.message : 'Vercel project creation failed'
        const errorMessage =
          baseMessage.includes('VERCEL PROJECT CREATION FAILED') ||
          baseMessage.includes('CANNOT APPROVE TENANT') ||
          baseMessage.includes('CANNOT CREATE TENANT') ||
          baseMessage.includes('CANNOT CHANGE TENANT STATUS')
            ? baseMessage
            : `CANNOT CREATE TENANT: ${baseMessage}`
        throw new APIError(errorMessage, 400)
      }
    }
  }

  // Handle status change from draft to approved
  if (operation === 'update' && data?.status === 'approved' && originalDoc?.status === 'draft') {
    try {
      // Get Vercel credentials using utility function
      const { teamId, vercelToken } = getVercelCredentials()

      // Check if tenant already has a Vercel project
      if (originalDoc.vercelProjectId) {
        logger.info(
          `Tenant "${originalDoc.name}" already has Vercel project, updating instead of creating`,
          { projectId: originalDoc.vercelProjectId, tenantName: originalDoc.name },
        )

        // Update existing Vercel project
        const { updateVercelProject } = await import('../endpoints/vercelClient')

        const vercelResult = await updateVercelProject(
          { teamId, vercelToken },
          originalDoc.vercelProjectId,
          {
            buildCommand: 'pnpm build:prod',
            installCommand: 'pnpm install',
          },
        )

        if (vercelResult.success && vercelResult.data) {
          logger.info(`Vercel project updated successfully for tenant "${originalDoc.name}"`, {
            projectId: originalDoc.vercelProjectId,
            tenantName: originalDoc.name,
          })
        } else {
          logger.error(`Failed to update Vercel project for tenant "${originalDoc.name}"`, {
            error: vercelResult.error,
            projectId: originalDoc.vercelProjectId,
            tenantName: originalDoc.name,
          })
          // Don't fail the status change if Vercel project update fails
          // The project still exists, just couldn't be updated
        }
      } else {
        logger.info(`Creating new Vercel project for tenant "${originalDoc.name}" status change`, {
          tenantName: originalDoc.name,
        })

        // Create new Vercel project FIRST
        const { createVercelProject } = await import('../endpoints/vercelClient')

        const vercelResult = await createVercelProject(
          { teamId, vercelToken },
          {
            name: data.name || originalDoc.name,
            buildCommand: 'pnpm build:prod',
            gitRepository:
              data.vercelProjectGitRepository || originalDoc.vercelProjectGitRepository
                ? {
                    type: (
                      data.vercelProjectGitRepository || originalDoc.vercelProjectGitRepository
                    ).type,
                    repo: `${(data.vercelProjectGitRepository || originalDoc.vercelProjectGitRepository).owner}/${(data.vercelProjectGitRepository || originalDoc.vercelProjectGitRepository).repo}`,
                  }
                : undefined,
            installCommand: 'pnpm install',
          },
        )

        // Check Vercel project creation result
        if (!vercelResult.success || !vercelResult.data) {
          logger.error(`Vercel project creation failed for tenant "${originalDoc.name}"`, {
            error: vercelResult.error,
            tenantName: originalDoc.name,
          })

          // CRITICAL: If Vercel project creation fails, prevent tenant status change
          // This maintains consistency and prevents orphaned tenants without Vercel projects
          // Use APIError like the deletion hook for better frontend display
          const { APIError } = await import('payload')
          const errorMessage = `CANNOT APPROVE TENANT: ${vercelResult.error || 'Vercel project creation failed'}`
          throw new APIError(errorMessage, 400)
        }

        const vercelProject = vercelResult.data
        logger.info(
          `Vercel project created successfully for tenant status change: ${vercelProject.id}`,
          { projectId: vercelProject.id, tenantName: originalDoc.name },
        )

        // Only set Vercel project data if creation was successful
        data.vercelProjectId = vercelProject.id
        data.vercelProjectName = vercelProject.name
        data.vercelProjectStatus = 'ready'
        data.vercelProjectFramework = vercelProject.framework || 'nextjs'
        data.vercelProjectUrl = vercelProject.url || ''
        data.vercelProjectCreatedAt = vercelProject.createdAt
          ? new Date(vercelProject.createdAt).toISOString()
          : new Date().toISOString()
        data.vercelProjectUpdatedAt = vercelProject.updatedAt
          ? new Date(vercelProject.updatedAt).toISOString()
          : new Date().toISOString()
        data.lastSynced = new Date().toISOString()

        logger.info(
          `Tenant "${originalDoc.name}" status will be changed to approved with Vercel project ${vercelProject.id}`,
          { projectId: vercelProject.id, tenantName: originalDoc.name },
        )
      }
    } catch (error) {
      logger.error(
        `Error handling status change for tenant "${originalDoc.name}"`,
        { tenantName: originalDoc.name },
        error as Error,
      )

      // CRITICAL: Re-throw the error to prevent tenant status change
      // This ensures no tenant is approved without a successful Vercel project
      if (error instanceof Error && error.message.includes('ValidationError')) {
        // Re-throw ValidationError as-is
        throw error
      } else {
        // Use APIError like the deletion hook for better frontend display
        // Check if error already has our custom prefix to avoid duplication
        const { APIError } = await import('payload')
        const baseMessage =
          error instanceof Error ? error.message : 'Vercel project creation failed'
        const errorMessage =
          baseMessage.includes('VERCEL PROJECT CREATION FAILED') ||
          baseMessage.includes('CANNOT APPROVE TENANT') ||
          baseMessage.includes('CANNOT CREATE TENANT') ||
          baseMessage.includes('CANNOT CHANGE TENANT STATUS')
            ? baseMessage
            : `CANNOT CHANGE TENANT STATUS: ${baseMessage}`
        throw new APIError(errorMessage, 400)
      }
    }
  }

  return data
}

export const tenantBeforeValidateHook: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  // For create operations, check if project already exists
  if (operation === 'create' && data?.vercelProjectId) {
    try {
      const existingTenant = await req.payload.find({
        collection: 'tenant',
        where: {
          vercelProjectId: {
            equals: data.vercelProjectId,
          },
        },
      })

      if (existingTenant.docs.length > 0) {
        // Skip creation if project already exists
        throw new Error(`Project with ID ${data.vercelProjectId} already exists`)
      }
    } catch (_error) {
      // If it's our custom error, re-throw it
      if (_error instanceof Error && _error.message.includes('already exists')) {
        throw _error
      }
      // For other errors (like connection issues), continue with creation
    }
  }
}

/**
 * Before-delete hook for tenant collection
 * Automatically deletes related records and Vercel project when a tenant is deleted
 * @param id - The tenant ID being deleted
 * @param req - The request object
 */
export const tenantBeforeDeleteHook: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // Get the tenant document before deletion
  const tenant = await req.payload.findByID({
    id,
    collection: 'tenant',
  })

  if (!tenant) {
    return
  }

  // Check if deletion is allowed based on business rules
  // User can only delete tenant if:
  // 1. status is 'draft' OR
  // 2. status is 'approved' AND isActive is false
  if (tenant.status === 'approved' && tenant.isActive === true) {
    const userFriendlyMessage = `Cannot delete "${tenant.name}" because it is deployed on vercel, set Is Active to false to delete it.`

    //  // Prevent deletion with a ValidationError that Payload can handle properly, using it for
    //  const { ValidationError } = await import('payload')
    //  throw new ValidationError({
    //    errors: [
    //      {
    //        message: userFriendlyMessage,
    //        path: 'isActive',
    //      },
    //    ],
    //  })
    // Prevent deletion with an APIError that Payload can handle properly
    const { APIError } = await import('payload')
    throw new APIError(userFriendlyMessage, 400)
  }

  // Collect cleanup information for frontend display
  try {
    // Count environment variables
    const envVarsCount = await req.payload.count({
      collection: 'tenant-envariable',
      where: {
        tenant: {
          equals: id,
        },
      },
    })

    // Count deployment records
    const deploymentsCount = await req.payload.count({
      collection: 'tenant-deployment',
      where: {
        tenant: {
          equals: id,
        },
      },
    })

    // Store cleanup info in request for afterDelete hook to access
    ;(req as any).tenantCleanupInfo = {
      deploymentsCount,
      envVarsCount,
      hasVercelProject: !!tenant.vercelProjectId,
      isActive: tenant.isActive,
      status: tenant.status,
      tenantId: id,
      tenantName: tenant.name,
      vercelProjectId: tenant.vercelProjectId,
    }
  } catch (_error) {
    // Don't fail deletion if cleanup info collection fails
    ;(req as any).tenantCleanupInfo = {
      deploymentsCount: 0,
      envVarsCount: 0,
      error: 'Failed to collect cleanup information',
      hasVercelProject: !!tenant.vercelProjectId,
      isActive: tenant.isActive,
      status: tenant.status,
      tenantId: id,
      tenantName: tenant.name,
      vercelProjectId: tenant.vercelProjectId,
    }
  }

  // Delete Vercel project if tenant is approved, inactive, and has a project ID
  // This needs to happen before tenant deletion since we need the tenant data
  if (tenant.status === 'approved' && !tenant.isActive && tenant.vercelProjectId) {
    try {
      // Get Vercel credentials using utility function
      const { teamId, vercelToken } = getVercelCredentials()

      // Delete Vercel project
      const { deleteVercelProject } = await import('../endpoints/vercelClient')

      const deleteResult = await deleteVercelProject(
        { teamId, vercelToken },
        tenant.vercelProjectId,
      )

      if (deleteResult.success) {
        // Update cleanup info to reflect Vercel project status
        if ((req as any).tenantCleanupInfo) {
          ;(req as any).tenantCleanupInfo.vercelProjectDeleted = true
        }
      } else {
        // Update cleanup info to reflect Vercel project status
        if ((req as any).tenantCleanupInfo) {
          ;(req as any).tenantCleanupInfo.vercelProjectDeleted = false
          ;(req as any).tenantCleanupInfo.vercelProjectError = deleteResult.error
        }
      }
    } catch (_error) {
      // Update cleanup info to reflect Vercel project status
      if ((req as any).tenantCleanupInfo) {
        ;(req as any).tenantCleanupInfo.vercelProjectDeleted = false
        ;(req as any).tenantCleanupInfo.vercelProjectError =
          _error instanceof Error ? _error.message : 'Unknown error'
      }
    }
  } else if (tenant.status === 'approved' && tenant.isActive) {
    // Update cleanup info to reflect Vercel project status
    if ((req as any).tenantCleanupInfo) {
      ;(req as any).tenantCleanupInfo.vercelProjectDeleted = false
      ;(req as any).tenantCleanupInfo.vercelProjectSkipped = 'Tenant still active'
    }
  } else if (tenant.status !== 'approved') {
    // Update cleanup info to reflect Vercel project status
    if ((req as any).tenantCleanupInfo) {
      ;(req as any).tenantCleanupInfo.vercelProjectDeleted = false
      ;(req as any).tenantCleanupInfo.vercelProjectSkipped = `Status: ${tenant.status}`
    }
  } else if (!tenant.vercelProjectId) {
    // Update cleanup info to reflect Vercel project status
    if ((req as any).tenantCleanupInfo) {
      ;(req as any).tenantCleanupInfo.vercelProjectDeleted = false
      ;(req as any).tenantCleanupInfo.vercelProjectSkipped = 'No Vercel project ID'
    }
  }

  // Explicitly return undefined to allow deletion
  return undefined
}

/**
 * After-delete hook for tenant collection
 * Cleans up related data after successful tenant deletion
 * @param id - The tenant ID that was deleted
 * @param req - The request object
 */
export const tenantAfterDeleteHook: CollectionAfterDeleteHook = async ({ id, req }) => {
  try {
    // Get cleanup info from beforeDelete hook
    const cleanupInfo = (req as any).tenantCleanupInfo
    let actualEnvVarsDeleted = 0
    let actualDeploymentsDeleted = 0

    // Delete related environment variables
    try {
      const existingEnvVars = await req.payload.find({
        collection: 'tenant-envariable',
        limit: 1,
        where: {
          tenant: {
            equals: id,
          },
        },
      })

      if (existingEnvVars.docs.length > 0) {
        const envVarsResult = await req.payload.delete({
          collection: 'tenant-envariable',
          where: {
            tenant: {
              equals: id,
            },
          },
        })

        actualEnvVarsDeleted = envVarsResult.docs.length
      }
    } catch (_error) {
      // Silently continue if cleanup fails
    }

    // Delete related deployment records
    try {
      const existingDeployments = await req.payload.find({
        collection: 'tenant-deployment',
        limit: 1,
        where: {
          tenant: {
            equals: id,
          },
        },
      })

      if (existingDeployments.docs.length > 0) {
        const deploymentsResult = await req.payload.delete({
          collection: 'tenant-deployment',
          where: {
            tenant: {
              equals: id,
            },
          },
        })

        actualDeploymentsDeleted = deploymentsResult.docs.length
      }
    } catch (_error) {
      // Silently continue if cleanup fails
    }

    // Store final cleanup results for frontend access
    if (cleanupInfo) {
      const finalCleanupResults = {
        actualDeploymentsDeleted,
        actualEnvVarsDeleted,
        cleanupCompleted: true,
        cleanupTimestamp: new Date().toISOString(),
        ...cleanupInfo,
        message: generateCleanupMessage(
          cleanupInfo,
          actualEnvVarsDeleted,
          actualDeploymentsDeleted,
        ),
      }

      // Store in request for potential frontend access
      ;(req as any).tenantCleanupResults = finalCleanupResults
    }
  } catch (_error) {
    // Silently continue if cleanup fails
  }
}

/**
 * Generate user-friendly cleanup message for frontend display
 */
function generateCleanupMessage(
  cleanupInfo: any,
  actualEnvVarsDeleted: number,
  actualDeploymentsDeleted: number,
): string {
  const { deploymentsCount, envVarsCount, hasVercelProject, tenantName, vercelProjectDeleted } =
    cleanupInfo

  let message = `✅ Tenant "${tenantName}" deleted successfully!`

  // Add cleanup details
  if (envVarsCount > 0 || deploymentsCount > 0) {
    message += `\n\n🧹 Cleanup completed:`

    if (envVarsCount > 0) {
      message += `\n• ${actualEnvVarsDeleted} environment variable${actualEnvVarsDeleted !== 1 ? 's' : ''} deleted`
    }

    if (deploymentsCount > 0) {
      message += `\n• ${actualDeploymentsDeleted} deployment record${actualDeploymentsDeleted !== 1 ? 's' : ''} deleted`
    }
  } else {
    message += `\n\nℹ️  No data cleanup needed - tenant had no environment variables or deployments`
  }

  // Add Vercel project cleanup info
  if (hasVercelProject) {
    if (vercelProjectDeleted) {
      message += `\n• Vercel project deleted`
    } else {
      message += `\n• Vercel project cleanup completed`
    }
  }

  return message
}

/**
 * Utility function to get cleanup results from request object
 * This can be used by the frontend to display cleanup information
 */
export function getTenantCleanupResults(req: any): any {
  return req.tenantCleanupResults || null
}

/**
 * Utility function to get cleanup info from request object
 * This can be used by the frontend to display cleanup information
 */
export function getTenantCleanupInfo(req: any): any {
  return req.tenantCleanupInfo || null
}

/**
 * Utility function to get cron update results from request object
 * This can be used by the frontend to display cron operation results
 */
export function getCronUpdateResult(req: any): any {
  return req.cronUpdateResult || null
}

// ============================================================================
// DASHBOARD REFRESH HOOKS
// ============================================================================

/**
 * Hook to trigger dashboard refresh when tenant data changes
 * This ensures the tenant status widget shows real-time data
 */
export const dashboardRefreshHook: CollectionAfterChangeHook = ({ doc, operation }) => {
  try {
    // Log the change for debugging
    logger.tenant(`Tenant ${operation}: ${doc.name || doc.id}`, {
      operation,
      status: doc.status,
      tenantId: doc.id,
    })

    // The frontend will automatically refresh tenant counts after sync operations
    // This hook ensures we log the changes for monitoring
  } catch (error) {
    logger.error('Error in dashboard refresh hook', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: doc.id,
    })
  }
}

export const dashboardDeleteHook: CollectionAfterDeleteHook = ({ id, _req }) => {
  try {
    // Log the deletion for debugging
    logger.tenant(`Tenant deleted: ${id}`)

    // The frontend will automatically refresh tenant counts after sync operations
    // This hook ensures we log the changes for monitoring
  } catch (error) {
    logger.error('Error in dashboard delete hook', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: id,
    })
  }
}

// Custom admin hook removed - using UI field approach instead
// Functions cannot be serialized in Payload admin config
