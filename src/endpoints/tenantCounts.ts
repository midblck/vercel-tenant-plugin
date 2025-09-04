import type { PayloadRequest } from 'payload'

import { createTenantAwareLogger } from '../utils/loggerInit'

export const tenantCountsHandler = async (req: PayloadRequest) => {
  const { payload } = req
  
  // Create tenant-aware logger
  const logger = createTenantAwareLogger(payload)
  
  try {

    // Use Payload's count functions directly (server-side)
    const [totalCountResult, approvedCountResult, draftCountResult] = await Promise.all([
      payload.count({
        collection: 'tenant',
      }),
      payload.count({
        collection: 'tenant',
        where: {
          status: {
            equals: 'approved',
          },
        },
      }),
      payload.count({
        collection: 'tenant',
        where: {
          status: {
            equals: 'draft',
          },
        },
      }),
    ])

    // Extract totalDocs from the count results
    const totalCount = totalCountResult.totalDocs || 0
    const approvedCount = approvedCountResult.totalDocs || 0
    const draftCount = draftCountResult.totalDocs || 0

    void logger.tenant('Tenant counts fetched successfully', {
      approved: approvedCount,
      draft: draftCount,
      total: totalCount,
    })

    return Response.json({
      approved: approvedCount,
      draft: draftCount,
      success: true,
      total: totalCount,
    })
  } catch (error) {
    void logger.error('Error fetching tenant counts', {
      error: error instanceof Error ? error.message : String(error),
    })

    return Response.json(
      {
        error: 'Failed to fetch tenant counts',
        success: false,
      },
      { status: 500 },
    )
  }
}
