/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadHandler } from 'payload'

import { getVercelProjects } from './vercelClient'
import { getVercelCredentialsForTenant, transformVercelProject } from './vercelUtils'
import { logger } from '../utils/logger'

// ============================================================================
// LIST PROJECTS ENDPOINT
// ============================================================================

export const listProjects: PayloadHandler = async (_req) => {
  try {
    const { teamId, vercelToken, source, isValid } = await getVercelCredentialsForTenant(
      _req.payload,
    )

    void logger.info(`Using credentials for project listing`, {
      source: source,
      isValid: isValid,
    })

    // Debug: Log token info (without exposing the full token) - removed for production

    const result = await getVercelProjects({ teamId, vercelToken })

    if (!result.success) {
      return Response.json(
        {
          error: result.error,
          success: false,
        },
        { status: 500 },
      )
    }

    // Transform the projects data for better readability
    const transformedProjects =
      (result.data as any)?.projects?.map((project: any) => {
        const transformed = transformVercelProject(project)

        // Debug: Log cron information if present - removed for production
        // Note: In development, you can uncomment this for debugging
        // if (project.crons) {
        //   console.log(`Project ${project.name} has crons:`, {
        //     definitionsCount: project.crons.definitions?.length || 0,
        //     disabledAt: project.crons.disabledAt || 'null',
        //     enabledAt: project.cernabledAt || 'null',
        //     updatedAt: project.crons.updatedAt || 'null',
        //   })
        // }

        return transformed
      }) || []

    return Response.json({
      data: transformedProjects,
      success: true,
      total: transformedProjects.length,
    })
  } catch (error) {
    // Use proper error logging instead of console.error
    // Note: In production, this should use a proper logger
    // console.error('Error in listProjects endpoint:', error)

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      },
      { status: 500 },
    )
  }
}
