/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeDeleteHook,
} from 'payload'

import { logger } from '../utils/logger'

// ============================================================================
// DEPLOYMENT DELETE HOOKS
// ============================================================================

/**
 * Before-delete hook for tenant deployment collection
 * Automatically deletes Vercel deployment when a queued deployment record is deleted
 * @param id - The document ID being deleted
 * @param req - The request object
 */
export const deploymentDeleteHook: CollectionBeforeDeleteHook = async ({ id, req }) => {
  try {
    const { payload } = req

    // Get the deployment record being deleted
    const deploymentRecord = await payload.findByID({
      id,
      collection: 'tenant-deployment',
    })

    if (!deploymentRecord) {
      return
    }

    // Only delete Vercel deployment if status is queued
    if (deploymentRecord.status !== 'queued') {
      return
    }

    // Only delete if it has a deploymentId
    if (!deploymentRecord.deploymentId) {
      return
    }

    try {
      // Import and call the cancel deployments function for queued deployments
      const { cancelDeployments } = await import('../endpoints/cancelDeployments')

      const mockReq = {
        json: () =>
          Promise.resolve({
            tenantId: deploymentRecord.tenant,
          }),
        payload,
      } as any

      await cancelDeployments(mockReq)
    } catch (deleteError) {
      void logger.error('Error deleting Vercel deployment', {
        deploymentId: deploymentRecord.deploymentId,
        error: deleteError instanceof Error ? deleteError.message : String(deleteError),
      })
      // Continue with local deletion even if Vercel deletion fails
    }
  } catch (error) {
    void logger.error('Error in deployment delete hook', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ============================================================================
// DEPLOYMENT TRIGGER HOOKS
// ============================================================================

/**
 * After-change hook for tenant deployment collection
 * Automatically triggers Vercel deployment when a new deployment record is created by user
 * Note: Auto deployments from environment variables are handled directly by envvarsAfterChangeHook
 * to prevent double deployment issues
 * @param doc - The document that was changed
 * @param operation - The operation type (create or update)
 * @param req - The request object
 */
export const deploymentTriggerHook: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  // Only proceed for create operations (when user creates a new deployment record)
  if (operation !== 'create') {
    return
  }

  // Only trigger deployment for manual or auto trigger types
  if (doc.triggerType !== 'manual' && doc.triggerType !== 'auto') {
    return
  }

  try {
    const { payload } = req
    const tenantId = typeof doc.tenant === 'string' ? doc.tenant : doc.tenant?.id

    if (!tenantId) {
      return
    }

    // Get the tenant to check if it has approved status and isActive
    const tenant = await payload.findByID({
      id: tenantId,
      collection: 'tenant',
    })

    if (!tenant || tenant.status !== 'approved' || tenant.isActive !== true) {
      return
    }

    // Simple direct deployment trigger
    try {
      const { createDeployment } = await import('../endpoints/createDeployment')

      const mockReq = {
        json: () =>
          Promise.resolve({
            deploymentData: {
              name: `${tenant.name}-${doc.triggerType === 'auto' ? 'autodeploy' : 'manual-deployment'}`,
              target: 'production',
            },
            tenantId,
          }),
        payload,
      } as any

      const result = await createDeployment(mockReq)
      const resultData = await result.json()

      if (result.status === 200 && resultData.success) {
        // Update the deployment record with Vercel deployment information
        // Use a deferred update to avoid timing issues
        setTimeout(async () => {
          try {
            // Try to find the document by tenant and trigger type as fallback
            const existingDeployment = await payload.find({
              collection: 'tenant-deployment',
              limit: 1,
              sort: '-createdAt',
              where: {
                createdAt: { greater_than: new Date(Date.now() - 30000) }, // Within last 30 seconds
                tenant: { equals: tenantId },
                triggerType: { equals: doc.triggerType },
              },
            })

            if (existingDeployment.docs.length > 0) {
              const targetDoc = existingDeployment.docs[0]

              await payload.update({
                id: targetDoc.id,
                collection: 'tenant-deployment',
                data: {
                  deploymentCreatedAt: new Date().toISOString(),
                  deploymentId: resultData.deployment.id,
                  deploymentUrl: resultData.deployment.url,
                  lastSynced: new Date().toISOString(),
                  status: 'building',
                },
              })
            }
          } catch (updateError) {
            void logger.error('Error updating deployment record', {
              error: updateError instanceof Error ? updateError.message : String(updateError),
            })
          }
        }, 2000) // Wait 2 seconds for the record to be fully saved
      } else {
        // Update the deployment record with error status
        setTimeout(async () => {
          try {
            const existingDeployment = await payload.find({
              collection: 'tenant-deployment',
              limit: 1,
              sort: '-createdAt',
              where: {
                createdAt: { greater_than: new Date(Date.now() - 30000) }, // Within last 30 seconds
                tenant: { equals: tenantId },
                triggerType: { equals: doc.triggerType },
              },
            })

            if (existingDeployment.docs.length > 0) {
              const targetDoc = existingDeployment.docs[0]

              await payload.update({
                id: targetDoc.id,
                collection: 'tenant-deployment',
                data: {
                  lastSynced: new Date().toISOString(),
                  status: 'error',
                },
              })
            }
          } catch (updateError) {
            void logger.error('Error updating deployment record with error', {
              error: updateError instanceof Error ? updateError.message : String(updateError),
            })
          }
        }, 2000) // Wait 2 seconds for the record to be fully saved
      }
    } catch (deploymentError) {
      void logger.error('Error triggering deployment', {
        error: deploymentError instanceof Error ? deploymentError.message : String(deploymentError),
        tenantId,
      })

      // Update the deployment record with error status
      setTimeout(async () => {
        try {
          const existingDeployment = await payload.find({
            collection: 'tenant-deployment',
            limit: 1,
            sort: '-createdAt',
            where: {
              createdAt: { greater_than: new Date(Date.now() - 30000) }, // Within last 30 seconds
              tenant: { equals: tenantId },
              triggerType: { equals: doc.triggerType },
            },
          })

          if (existingDeployment.docs.length > 0) {
            const targetDoc = existingDeployment.docs[0]

            await payload.update({
              id: targetDoc.id,
              collection: 'tenant-deployment',
              data: {
                lastSynced: new Date().toISOString(),
                status: 'error',
              },
            })
          }
        } catch (updateError) {
          void logger.error('Error updating deployment record with error', {
            error: updateError instanceof Error ? updateError.message : String(updateError),
          })
        }
      }, 2000) // Wait 2 seconds for the record to be fully saved
    }
  } catch (error) {
    void logger.error('Error in deployment trigger hook', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ============================================================================
// DASHBOARD REFRESH HOOKS
// ============================================================================

/**
 * Hook to trigger dashboard refresh when tenant-deployment data changes
 * This ensures the deployment status widget shows real-time data
 */
export const dashboardDeploymentRefreshHook: CollectionAfterChangeHook = ({ doc, operation }) => {
  try {
    // Log the change for debugging
    void logger.deployment(`Tenant deployment ${operation}: ${doc.id}`, {
      deploymentId: doc.id,
      operation,
      status: doc.status,
      tenantId: doc.tenant,
    })

    // The frontend will automatically refresh deployment counts after sync operations
    // This hook ensures we log the changes for monitoring
  } catch (error) {
    void logger.error('Error in dashboard deployment refresh hook', {
      deploymentId: doc.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export const dashboardDeploymentDeleteHook: CollectionAfterDeleteHook = ({ id }) => {
  try {
    // Log the deletion for debugging
    void logger.deployment(`Tenant deployment deleted: ${id}`)

    // The frontend will automatically refresh deployment counts after sync operations
    // This hook ensures we log the changes for monitoring
  } catch (error) {
    void logger.error('Error in dashboard deployment delete hook', {
      deploymentId: id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
