/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadHandler } from 'payload'

import { logger } from '../utils/logger'
import { withErrorHandling } from '../utils/errors'
import { getVercelCredentials } from './vercelUtils'

export const cancelDeployments: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
    logger.deployment('Starting queued deployments cancellation...')
    const { teamId, vercel } = getVercelCredentials()

    // Safely parse request body, handling empty or malformed JSON
    let tenantId: string | undefined
    try {
      const body = await req.json?.()
      tenantId = body?.tenantId
    } catch (_error) {
      // If JSON parsing fails (empty body, malformed JSON), continue without tenantId
      logger.deployment('No valid JSON body found, proceeding without tenantId filter')
      tenantId = undefined
    }

    const { payload } = req

    logger.deployment('Request params', { teamId, tenantId })

    // Build query for queued deployments
    const query: any = {
      status: { equals: 'queued' },
    }

    // If tenantId is provided, filter by tenant
    if (tenantId) {
      query.tenant = { equals: tenantId }
    }

    // Find all queued deployments
    const queuedDeployments = await payload.find({
      collection: 'tenant-deployment',
      where: query,
    })

    logger.deployment(`Found ${queuedDeployments.docs.length} queued deployments`, {
      count: queuedDeployments.docs.length,
    })

    let successCount = 0
    let errorCount = 0
    const results = []

    // Delete each queued deployment
    for (const deployment of queuedDeployments.docs) {
      try {
        if (deployment.deploymentId) {
          logger.deployment(`Canceling deployment: ${deployment.deploymentId}`, {
            deploymentId: deployment.deploymentId,
          })

          // Delete deployment on Vercel
          const vercelResult = await vercel.deployments.deleteDeployment({
            id: deployment.deploymentId,
            teamId,
          })

          logger.deployment(`Vercel deletion result`, { result: vercelResult })

          // Delete local record
          await payload.delete({
            id: deployment.id,
            collection: 'tenant-deployment',
          })

          results.push({
            deploymentId: deployment.deploymentId,
            status: 'success',
            vercelState: vercelResult.state,
          })
          successCount++
        } else {
          // If no deploymentId, just delete the local record
          await payload.delete({
            id: deployment.id,
            collection: 'tenant-deployment',
          })

          results.push({
            deploymentId: null,
            note: 'Local record only (no Vercel deployment ID)',
            status: 'success',
          })
          successCount++
        }
      } catch (error) {
        logger.error(`Error canceling deployment ${deployment.deploymentId}`, {
          deploymentId: deployment.deploymentId,
          error: error instanceof Error ? error.message : String(error),
        })
        results.push({
          deploymentId: deployment.deploymentId,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
        })
        errorCount++
      }
    }

    const message = tenantId
      ? `Canceled ${successCount} queued deployments for tenant, ${errorCount} errors`
      : `Canceled ${successCount} queued deployments across all tenants, ${errorCount} errors`

    logger.deployment('Final result', {
      errorCount,
      message,
      successCount,
      totalProcessed: queuedDeployments.docs.length,
    })

    return Response.json({
      errorCount,
      message,
      results,
      success: true,
      successCount,
      totalProcessed: queuedDeployments.docs.length,
    })
  }, 'cancelDeployments')
}
