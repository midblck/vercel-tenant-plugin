/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadHandler } from 'payload'

import { logger } from '../utils/logger'
import { withErrorHandling } from '../utils/errors'
import { getVercelCredentials } from './vercelUtils'

export const syncDeployments: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
     
    const { teamId, vercel } = await getVercelCredentials(req.payload)

    // Safely parse JSON request body
    let syncAll, tenantId
    try {
      const body = await req.json?.()
      if (body) {
        syncAll = body.syncAll
        tenantId = body.tenantId
      }
    } catch (error) {
      // If JSON parsing fails, use empty object (default values)
      void logger.debug('No JSON body or parsing failed, using defaults', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const { payload } = req

    let tenants = []

    if (syncAll) {
      // Get all tenants with Vercel projects
      const tenantsResult = await payload.find({
        collection: 'tenant',
        where: {
          vercelProjectId: { exists: true },
        },
      })
      tenants = tenantsResult.docs || []
    } else if (tenantId) {
      // Get specific tenant
      const tenant = await payload.findByID({ id: tenantId, collection: 'tenant' })
      if (!tenant?.vercelProjectId) {
        return Response.json(
          { error: 'Tenant not found or missing project', success: false },
          { status: 404 },
        )
      }
      tenants = [tenant]
    } else {
      return Response.json(
        { error: 'Missing tenantId or syncAll parameter', success: false },
        { status: 400 },
      )
    }

    let totalSynced = 0
    let totalDeleted = 0
    let totalUpdated = 0
    let totalCreated = 0
    let totalSkippedInactive = 0
    let currentProgress = 0
    const syncResults = []

    // Progress tracking function
    const updateProgress = (tenantName: string, status: string) => {
      currentProgress++
      void logger.deployment(`🔄 [${currentProgress}/${tenants.length}] ${status}: ${tenantName}`)
    }

    // Delete all existing sync deployment records before syncing new data
    try {
      const deleteResult = await payload.delete({
        collection: 'tenant-deployment',
        where: {
          triggerType: {
            equals: 'sync',
          },
        },
      })
      totalDeleted = deleteResult.docs?.length || 0
    } catch (deleteError) {
      void logger.error('Error deleting existing sync records', {
        error: deleteError instanceof Error ? deleteError.message : String(deleteError),
      })
    }

    // Process each tenant
    for (const tenant of tenants) {
      // Skip tenants that are not approved or inactive
      if (tenant.status !== 'approved' || tenant.isActive !== true) {
        totalSkippedInactive++
        void logger.deployment(
          `⏭️ Skipping tenant ${tenant.name} - status: ${tenant.status}, isActive: ${tenant.isActive}`,
          {
            tenantId: tenant.id,
            tenantIsActive: tenant.isActive,
            tenantName: tenant.name,
            tenantStatus: tenant.status,
          },
        )
        continue
      }

      void updateProgress(tenant.name, 'Processing');

      // Always use project ID for consistency
      const projectId = tenant.vercelProjectId

      // Get deployments from Vercel (only 3 latest)
      const result = await vercel.deployments.getDeployments({ limit: 1, projectId, teamId })
      const deployments = result?.deployments || []

      let syncedCount = 0
      let updatedCount = 0
      let createdCount = 0

      for (const deployment of deployments) {
        try {
          // Check if deployment with this ID already exists (could be manual deployment)
          const existingDeployment = await payload.find({
            collection: 'tenant-deployment',
            limit: 1,
            where: {
              deploymentId: {
                equals: deployment.uid,
              },
            },
          })

          // Also check for any recent deployments from this tenant that might be the same deployment
          // but with different IDs (manual/auto deployments that haven't been updated yet)
          const recentDeployments = await payload.find({
            collection: 'tenant-deployment',
            limit: 5,
            sort: '-createdAt',
            where: {
              createdAt: { greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
              tenant: { equals: tenant.id },
              triggerType: { in: ['manual', 'auto'] },
            },
          })

          // Auto-update existing deployments that have deploymentId with the latest data from Vercel
          if (existingDeployment.docs.length > 0) {
            const existingDoc = existingDeployment.docs[0]

            try {
              // Update the existing deployment with the latest data from the current sync
              await payload.update({
                id: existingDoc.id,
                collection: 'tenant-deployment',
                data: {
                  deploymentCreatedAt: deployment.created
                    ? new Date(deployment.created).toISOString()
                    : existingDoc.deploymentCreatedAt,
                  deploymentUrl: deployment.url || existingDoc.deploymentUrl,
                  lastSynced: new Date().toISOString(),
                  status: (deployment.state || 'unknown').toLowerCase(),
                },
              })
            } catch (updateError) {
              void logger.error(`Error updating existing deployment ${existingDoc.deploymentId}`, {
                deploymentId: existingDoc.deploymentId,
                error: updateError instanceof Error ? updateError.message : String(updateError),
              })
              // Continue with normal sync if update fails
            }
          }

          const deploymentData = {
            buildId: deployment.uid,
            deploymentCreatedAt: deployment.created
              ? new Date(deployment.created).toISOString()
              : undefined,
            deploymentId: deployment.uid,
            deploymentUrl: deployment.url || '',
            environment: deployment.target || 'production',
            events: [],
            lastSynced: new Date().toISOString(),
            status: (deployment.state || 'unknown').toLowerCase(),
            tenant: tenant.id,
            triggerType: 'sync',
          }

          if (existingDeployment.docs.length > 0) {
            // Update existing deployment to sync type with latest data
            // Add sync status to deployment data
            const updatedDeploymentData = {
              ...deploymentData,
              lastSyncData: {
                deploymentId: deployment.uid,
                environment: deployment.target,
                status: deployment.state,
                syncedAt: new Date().toISOString(),
                url: deployment.url,
              },
              lastSyncMessage: `✅ Deployment data updated from Vercel sync`,
              lastSyncStatus: 'synced',
            }

            await payload.update({
              id: existingDeployment.docs[0].id,
              collection: 'tenant-deployment',
              data: updatedDeploymentData,
            })

            void updateProgress(tenant.name, 'Updated');
            updatedCount++

            syncResults.push({
              deploymentId: deployment.uid,
              details: {
                environment: deployment.target || 'production',
                status: deployment.state || 'unknown',
                tenantId: tenant.id,
                url: deployment.url || 'N/A',
              },
              message: `🔄 Successfully updated deployment "${deployment.uid}" for tenant "${tenant.name}"`,
              status: 'updated',
              tenantName: tenant.name,
            })
          } else {
            // Create new sync deployment
            // Add sync status to deployment data
            const newDeploymentData = {
              ...deploymentData,
              lastSyncData: {
                deploymentId: deployment.uid,
                environment: deployment.target,
                status: deployment.state,
                syncedAt: new Date().toISOString(),
                url: deployment.url,
              },
              lastSyncMessage: `✅ New deployment created from Vercel sync`,
              lastSyncStatus: 'synced',
            }

            await payload.create({
              collection: 'tenant-deployment',
              data: newDeploymentData,
            })

            void updateProgress(tenant.name, 'Created');
            createdCount++

            syncResults.push({
              deploymentId: deployment.uid,
              details: {
                environment: deployment.target || 'production',
                status: deployment.state || 'unknown',
                tenantId: tenant.id,
                url: deployment.url || 'N/A',
              },
              message: `✅ Successfully created deployment "${deployment.uid}" for tenant "${tenant.name}"`,
              status: 'created',
              tenantName: tenant.name,
            })
          }

          // Update status of recent manual/auto deployments that might be the same deployment
          if (recentDeployments.docs.length > 0) {
            for (const recentDeployment of recentDeployments.docs) {
              // Update the status and lastSynced of recent deployments
              try {
                await payload.update({
                  id: recentDeployment.id,
                  collection: 'tenant-deployment',
                  data: {
                    lastSynced: new Date().toISOString(),
                    status: (deployment.state || 'unknown').toLowerCase(),
                  },
                })
              } catch (updateError) {
                void logger.error(`Error updating recent deployment ${recentDeployment.id}`, {
                  deploymentId: recentDeployment.id,
                  error: updateError instanceof Error ? updateError.message : String(updateError),
                })
              }
            }
          }

          syncedCount++
        } catch (error) {
          void logger.error(`Error syncing deployment ${deployment.uid}`, {
            deploymentId: deployment.uid,
            error: error instanceof Error ? error.message : String(error),
          })

          syncResults.push({
            deploymentId: deployment.uid,
            details: {
              error: error instanceof Error ? error.message : 'Unknown error',
              tenantId: tenant.id,
            },
            message: `❌ Failed to sync deployment "${deployment.uid}" for tenant "${tenant.name}"`,
            status: 'error',
            tenantName: tenant.name,
          })
        }
      }

      totalSynced += syncedCount
      totalUpdated += updatedCount
      totalCreated += createdCount
    }

    // Connect latest deployments to tenants
    let connectedCount = 0

    try {
      // Get all sync deployment records grouped by tenant
      const allSyncDeployments = await payload.find({
        collection: 'tenant-deployment',
        sort: '-deploymentCreatedAt', // Sort by newest first
        where: {
          triggerType: {
            equals: 'sync',
          },
        },
      })

      // Group deployments by tenant ID
      const deploymentsByTenant: Record<string, any[]> = {}
      for (const deployment of allSyncDeployments.docs) {
        const tenantId =
          typeof deployment.tenant === 'string' ? deployment.tenant : deployment.tenant?.id
        if (tenantId) {
          if (!deploymentsByTenant[tenantId]) {
            deploymentsByTenant[tenantId] = []
          }
          deploymentsByTenant[tenantId].push(deployment)
        }
      }

      // Connect latest deployment to each tenant
      for (const [tenantId, deployments] of Object.entries(deploymentsByTenant)) {
        if (deployments.length > 0) {
          const latestDeployment = deployments[0] // Already sorted by newest first

          // Normalize deployment status to match tenant collection field options
          const normalizedStatus = (() => {
            const status = latestDeployment.status?.toLowerCase()
            // Map Vercel statuses to tenant collection field options
            const statusMap: Record<string, string> = {
              building: 'building',
              canceled: 'canceled',
              error: 'error',
              queued: 'queued',
              ready: 'ready',
              // Handle any other statuses gracefully
              deployed: 'ready',
              failed: 'error',
              unknown: 'error',
            }
            const result = statusMap[status] || 'error'

            // Log status normalization for debugging
            if (status !== result) {
              void logger.debug('Deployment status normalized', {
                deploymentId: latestDeployment.id,
                normalizedStatus: result,
                originalStatus: latestDeployment.status,
                tenantId,
              })
            }

            return result
          })()

          await payload.update({
            id: tenantId,
            collection: 'tenant',
            data: {
              _syncOrigin: 'vercel-sync', // Flag to prevent infinite loops
              lastDeploymentAt: latestDeployment.deploymentCreatedAt || new Date().toISOString(),
              lastDeploymentStatus: normalizedStatus,
              latestDeployment: latestDeployment.id,
            },
          })

          connectedCount++
        }
      }
    } catch (connectionError) {
      void logger.error('Error connecting deployments to tenants', {
        error: connectionError instanceof Error ? connectionError.message : String(connectionError),
      })
    }

    // Sync environment variables after deployment sync completes
    let envVarSyncResult = null
    try {
      void logger.info('Starting environment variable sync after deployment sync')

      // Create a mock request for environment variable sync
      const envVarReq = {
        json: () => Promise.resolve({ syncAll: true }),
        payload,
      } as any

      // Import and call the sync environment variables function
      const { syncEnvironmentVariables } = await import('./syncEnvironmentVariables')
      const envVarResponse = await syncEnvironmentVariables(envVarReq)
      envVarSyncResult = await envVarResponse.json()

      if (envVarResponse.ok && envVarSyncResult.success) {
        void logger.info('Environment variable sync completed successfully', {
          newEnvVars: envVarSyncResult.data?.newEnvVars || 0,
          skippedEnvVars: envVarSyncResult.data?.skippedEnvVars || 0,
          updatedEnvVars: envVarSyncResult.data?.updatedEnvVars || 0,
        })
      } else {
        void logger.error('Environment variable sync failed', {
          error: envVarSyncResult.error || 'Unknown error',
        })
        // Don't fail the entire deployment sync, just log the error
      }
    } catch (envVarError) {
      void logger.error('Error during environment variable sync', {
        error: envVarError instanceof Error ? envVarError.message : String(envVarError),
      })
      // Don't fail the entire deployment sync, just log the error
    }

    const message = `🎯 Sync completed: ${totalCreated} new deployments created, ${totalUpdated} existing deployments updated, ${totalDeleted} old sync records deleted, ${connectedCount} tenants connected to latest deployments, ${totalSkippedInactive} inactive tenants skipped${envVarSyncResult?.success ? `, ${envVarSyncResult.data?.newEnvVars || 0} new env vars created, ${envVarSyncResult.data?.updatedEnvVars || 0} env var vercelIds updated` : ''}`

    return Response.json({
      data: {
        connectedTenants: connectedCount,
        deletedRecords: totalDeleted,
        newDeployments: totalCreated,
        totalDeployments: totalSynced,
        totalTenants: tenants.length,
        updatedDeployments: totalUpdated,
        // Include environment variable sync results
        envVarSync: envVarSyncResult?.success
          ? {
              newEnvVars: envVarSyncResult.data?.newEnvVars || 0,
              skippedEnvVars: envVarSyncResult.data?.skippedEnvVars || 0,
              totalEnvVars: envVarSyncResult.data?.totalEnvVars || 0,
              updatedEnvVars: envVarSyncResult.data?.updatedEnvVars || 0,
            }
          : null,
      },
      message,
      progress: {
        current: tenants.length,
        message: `✅ All ${tenants.length} tenants processed successfully`,
        total: tenants.length,
      },
      success: true,
      summary: {
        connectedTenants: connectedCount,
        deletedRecords: totalDeleted,
        newDeployments: totalCreated,
        successRate:
          tenants.length > 0 ? Math.round(((totalCreated + totalUpdated) / totalSynced) * 100) : 0,
        totalDeployments: totalSynced,
        totalTenants: tenants.length,
        updatedDeployments: totalUpdated,
        // Include environment variable sync summary
        envVarSync: envVarSyncResult?.success
          ? {
              skippedEnvVars: envVarSyncResult.data?.skippedEnvVars || 0,
              totalEnvVars: envVarSyncResult.data?.totalEnvVars || 0,
              updatedEnvVars: envVarSyncResult.data?.updatedEnvVars || 0,
            }
          : null,
      },
      syncResults,
      toastMessages: [
        {
          type: 'success',
          details: {
            connectedTenants: connectedCount,
            deletedRecords: totalDeleted,
            newDeployments: totalCreated,
            updatedDeployments: totalUpdated,
            // Include environment variable sync details
            ...(envVarSyncResult?.success && {
              skippedEnvVars: envVarSyncResult.data?.skippedEnvVars || 0,
              updatedEnvVars: envVarSyncResult.data?.updatedEnvVars || 0,
            }),
          },
          title: 'Deployment & Environment Variables Sync Completed',
        },
      ],
      total: tenants.length,
    })
  }, 'syncDeployments')
}
