import type { PayloadHandler } from 'payload'

import { logger } from '../utils/logger'
import { withErrorHandling } from '../utils/errors'
import { getVercelCredentials } from './vercelUtils'

export const deleteDeployment: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
    logger.deployment('Starting deployment deletion...')
    const { teamId, vercel } = getVercelCredentials()
    const { deploymentId, tenantDeploymentId } = (await req.json?.()) || {}
    const { payload } = req

    logger.deployment('Request params', { deploymentId, teamId, tenantDeploymentId })

    if (!deploymentId) {
      return Response.json(
        { error: 'Missing deploymentId parameter', success: false },
        { status: 400 },
      )
    }

    // Delete deployment on Vercel
    logger.deployment('Deleting deployment on Vercel', { deploymentId })
    const result = await vercel.deployments.deleteDeployment({
      id: deploymentId,
      teamId,
    })

    logger.deployment('Vercel deletion result', { result })

    // If tenantDeploymentId is provided, also delete the local record
    if (tenantDeploymentId) {
      logger.deployment('Deleting local tenant-deployment record', { tenantDeploymentId })
      await payload.delete({
        id: tenantDeploymentId,
        collection: 'tenant-deployment',
      })
      logger.deployment('Local record deleted successfully')
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
