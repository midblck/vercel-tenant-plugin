import type { PayloadRequest } from 'payload'

import { logger } from '../utils/logger'

export const tenantDeploymentCountsHandler = async (req: PayloadRequest) => {
  try {
    const { payload } = req

    // Use Payload's count functions directly (server-side)
    const [totalCountResult, readyCountResult, buildingCountResult, errorCountResult] =
      await Promise.all([
        payload.count({
          collection: 'tenant-deployment',
        }),
        payload.count({
          collection: 'tenant-deployment',
          where: {
            status: {
              equals: 'ready',
            },
          },
        }),
        payload.count({
          collection: 'tenant-deployment',
          where: {
            status: {
              equals: 'building',
            },
          },
        }),
        payload.count({
          collection: 'tenant-deployment',
          where: {
            status: {
              equals: 'error',
            },
          },
        }),
      ])

    // Extract totalDocs from the count results
    const totalCount = totalCountResult.totalDocs || 0
    const readyCount = readyCountResult.totalDocs || 0
    const buildingCount = buildingCountResult.totalDocs || 0
    const errorCount = errorCountResult.totalDocs || 0

    logger.deployment('Tenant deployment counts fetched successfully', {
      building: buildingCount,
      error: errorCount,
      ready: readyCount,
      total: totalCount,
    })

    return Response.json({
      building: buildingCount,
      error: errorCount,
      ready: readyCount,
      success: true,
      total: totalCount,
    })
  } catch (error) {
    logger.error('Error fetching tenant deployment counts', {
      error: error instanceof Error ? error.message : String(error),
    })

    return Response.json(
      {
        error: 'Failed to fetch tenant deployment counts',
        success: false,
      },
      { status: 500 },
    )
  }
}
