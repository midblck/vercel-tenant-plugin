import type { Payload } from 'payload'
import { logger } from './logger'

// ============================================================================
// VERCEL WORKFLOW UTILITIES
// ============================================================================

/**
 * Workflow: Payload Update → Vercel Action → Sync → Update Tenant (No Loop)
 *
 * This utility implements the workflow pattern:
 * 1. Payload operation updates data
 * 2. Send data to Vercel action/update
 * 3. After Vercel processes, call syncSingleProject
 * 4. Update tenant collection with sync data
 * 5. Prevent infinite loops using _syncOrigin flag
 */

export interface VercelWorkflowOptions {
  payload: Payload
  projectId: string
  syncAfterVercel?: boolean // Whether to sync after Vercel action
  tenantId: string
  vercelAction: () => Promise<any> // Function that calls Vercel API
}

/**
 * Execute the Vercel workflow pattern
 * This prevents infinite loops while maintaining data consistency
 */
export async function executeVercelWorkflow(options: VercelWorkflowOptions) {
  const { payload, projectId, syncAfterVercel = true, tenantId, vercelAction } = options

  try {
    // Step 1: Execute Vercel action (update, create, etc.)
    logger.info('🚀 Starting Vercel workflow execution', {
      actionType: vercelAction.name || 'anonymous',
      payloadAvailable: !!payload,
      projectId,
      step: 'vercel-action-start',
      syncAfterVercel,
      tenantId,
      timestamp: new Date().toISOString(),
      workflowId: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    })

    logger.debug('📋 Vercel action details', {
      actionType: vercelAction.name || 'anonymous',
      payloadAvailable: !!payload,
      projectId,
      syncAfterVercel,
      tenantId,
    })

    // Execute the Vercel action with detailed logging
    logger.info('⚡ Executing Vercel action...', {
      projectId,
      startTime: new Date().toISOString(),
      step: 'vercel-action-execute',
      tenantId,
    })

    const startTime = Date.now()
    const vercelResult = await vercelAction()
    const executionTime = Date.now() - startTime

    logger.info('✅ Vercel action execution completed', {
      dataKeys: vercelResult.data ? Object.keys(vercelResult.data) : [],
      executionTimeMs: executionTime,
      hasData: !!vercelResult.data,
      projectId,
      step: 'vercel-action-complete',
      success: vercelResult.success,
      tenantId,
      timestamp: new Date().toISOString(),
    })

    if (!vercelResult.success) {
      logger.error('❌ Vercel action failed', {
        error: vercelResult.error || 'Unknown error',
        executionTimeMs: executionTime,
        projectId,
        step: 'vercel-action-failed',
        tenantId,
        timestamp: new Date().toISOString(),
      })
      throw new Error(`Vercel action failed: ${vercelResult.error || 'Unknown error'}`)
    }

    logger.info('🎯 Vercel action completed successfully', {
      executionTimeMs: executionTime,
      projectId,
      resultSummary: vercelResult.data
        ? {
            dataType: typeof vercelResult.data,
            hasId: vercelResult.data.id ? true : false,
            hasStatus: vercelResult.data.status ? true : false,
            isObject: typeof vercelResult.data === 'object',
            keys: Object.keys(vercelResult.data),
            status: vercelResult.data.status || 'unknown',
          }
        : 'no-data',
      step: 'vercel-action-success',
      tenantId,
      timestamp: new Date().toISOString(),
    })

    // Step 2: Sync data back from Vercel (optional)
    if (syncAfterVercel) {
      logger.info('🔄 Starting sync process after Vercel action', {
        projectId,
        step: 'sync-start',
        syncReason: 'Post-vercel-action-sync',
        tenantId,
        timestamp: new Date().toISOString(),
      })

      // Import and call syncSingleProject
      logger.debug('📦 Importing syncSingleProject module', {
        projectId,
        step: 'sync-import',
        tenantId,
        timestamp: new Date().toISOString(),
      })

      const { syncSingleProject } = await import('../endpoints/syncSingleProject')

      // Create mock request for syncSingleProject
      logger.debug('🔧 Creating mock request for syncSingleProject', {
        hasPayload: !!payload,
        projectId,
        requestUrl: `/api/sync-single-project?projectId=${projectId}`,
        step: 'sync-request-prep',
        tenantId,
        timestamp: new Date().toISOString(),
      })

      const mockReq = {
        json: () => Promise.resolve({ projectId }),
        payload,
        url: `/api/sync-single-project?projectId=${projectId}`,
      } as any

      logger.info('🚀 Executing syncSingleProject...', {
        projectId,
        startTime: new Date().toISOString(),
        step: 'sync-execute',
        tenantId,
      })

      const syncStartTime = Date.now()
      const syncResult = await syncSingleProject(mockReq)
      const syncExecutionTime = Date.now() - syncStartTime

      logger.info('📊 Sync execution completed', {
        hasJson: typeof syncResult.json === 'function',
        projectId,
        responseOk: syncResult.ok,
        responseStatus: syncResult.status,
        step: 'sync-execute-complete',
        syncExecutionTimeMs: syncExecutionTime,
        tenantId,
        timestamp: new Date().toISOString(),
      })

      if (syncResult.status === 200) {
        logger.debug('📥 Processing successful sync response', {
          projectId,
          step: 'sync-response-process',
          tenantId,
          timestamp: new Date().toISOString(),
        })

        const responseData = await syncResult.json()

        logger.debug('📋 Sync response data received', {
          hasSuccess: 'success' in responseData,
          projectId,
          responseKeys: responseData ? Object.keys(responseData) : [],
          step: 'sync-response-data',
          success: responseData.success,
          tenantId,
          timestamp: new Date().toISOString(),
        })

        if (responseData.success) {
          logger.info('✅ Sync completed successfully after Vercel action', {
            projectId,
            responseSummary: {
              dataKeys: responseData.data ? Object.keys(responseData.data) : [],
              hasData: !!responseData.data,
              message: responseData.message || 'No message',
              success: responseData.success,
              timestamp: new Date().toISOString(),
            },
            step: 'sync-success',
            syncExecutionTimeMs: syncExecutionTime,
            tenantId,
            timestamp: new Date().toISOString(),
          })
        } else {
          logger.warn('⚠️ Sync failed after Vercel action', {
            error: responseData.error,
            projectId,
            responseData,
            step: 'sync-failed',
            syncExecutionTimeMs: syncExecutionTime,
            tenantId,
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        logger.warn('⚠️ Sync returned error status after Vercel action', {
          ok: syncResult.ok,
          projectId,
          status: syncResult.status,
          statusText: syncResult.statusText,
          step: 'sync-error-status',
          syncExecutionTimeMs: syncExecutionTime,
          tenantId,
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      logger.info('⏭️ Skipping sync after Vercel action (syncAfterVercel: false)', {
        projectId,
        step: 'sync-skipped',
        tenantId,
        timestamp: new Date().toISOString(),
      })
    }

    // Step 3: Return success with workflow completion
    return {
      message: 'Vercel workflow completed successfully',
      projectId,
      success: true,
      synced: syncAfterVercel,
      tenantId,
      vercelResult,
    }
  } catch (error) {
    logger.error('Vercel workflow failed', {
      error: error instanceof Error ? error.message : String(error),
      projectId,
      step: 'workflow-error',
      tenantId,
    })

    // Update tenant with error status (this will set _syncOrigin flag)
    try {
      await payload.update({
        id: tenantId,
        collection: 'tenant',
        data: {
          _syncOrigin: 'vercel-sync',
          lastSyncData: {
            error: error instanceof Error ? error.message : String(error),
            status: 'error',
            syncedAt: new Date().toISOString(),
            workflowStep: 'vercel-action',
          },
          lastSyncMessage: `Workflow failed: ${error instanceof Error ? error.message : String(error)}`,
          lastSyncStatus: 'error',
        },
      })
    } catch (updateError) {
      logger.error('Failed to update tenant with workflow error', {
        error: updateError instanceof Error ? updateError.message : String(updateError),
        tenantId,
      })
    }

    return {
      error: error instanceof Error ? error.message : String(error),
      projectId,
      success: false,
      tenantId,
    }
  }
}

/**
 * Helper function to check if a tenant update was caused by a sync operation
 * This prevents infinite loops in hooks
 */
export function isSyncUpdate(doc: any): boolean {
  return doc._syncOrigin === 'vercel-sync'
}

/**
 * Helper function to check if a tenant update was caused by a workflow operation
 * This provides additional context for loop prevention
 */
export function isWorkflowUpdate(doc: any): boolean {
  return doc._syncOrigin === 'vercel-sync' || (doc.lastSyncData?.workflowStep && doc.lastSyncStatus)
}
