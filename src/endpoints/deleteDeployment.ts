import type { PayloadHandler } from 'payload'

import { logger } from '../utils/logger'
import { withErrorHandling } from '../utils/errors'
import { getVercelCredentials } from './vercelUtils'

export const deleteDeployment: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
    void logger.deployment('Starting deployment deletion...')
     
    const { teamId, vercel } = await getVercelCredentials(req.payload)

    // Safely parse JSON request body
    let deploymentId, tenantDeploymentId
    try {
      const body = await req.json?.()
      if (body) {
        deploymentId = body.deploymentId
        tenantDeploymentId = body.tenantDeploymentId
      }
    } catch (error) {
      // If JSON parsing fails, use empty object (default values)
      void logger.debug('No JSON body or parsing failed, using defaults', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const { payload } = req

    void logger.deployment('Request params', { deploymentId, teamId, tenantDeploymentId })

    if (!deploymentId) {
      return Response.json(
        { error: 'Missing deploymentId parameter', success: false },
        { status: 400 },
      )
    }

    // Delete deployment on Vercel
    void logger.deployment('Deleting deployment on Vercel', { deploymentId })
    const result = await vercel.deployments.deleteDeployment({
      id: deploymentId,
      teamId,
    })

    void logger.deployment('Vercel deletion result', { result })

    // If tenantDeploymentId is provided, also delete the local record
    if (tenantDeploymentId) {
      void logger.deployment('Deleting local tenant-deployment record', { tenantDeploymentId })
      await payload.delete({
        id: tenantDeploymentId,
        collection: 'tenant-deployment',
      })
      void logger.deployment('Local record deleted successfully')
    }

    return Response.json({
      deployment: {
        state: result.state,
        uid: result.uid,
      },
      message: 'Deployment deleted successfully',
      success: true,
    })
  }, 'deleteDeployment')
}
