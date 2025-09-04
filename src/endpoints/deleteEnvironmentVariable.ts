/* eslint-disable perfectionist/sort-objects */
import type { PayloadHandler } from 'payload'

import { getVercelCredentials } from './vercelUtils'
import { logger } from '../utils/logger'

interface DeleteEnvVarRequest {
  envVarId: string
  projectId: string
  teamId?: string
}

interface DeleteEnvVarResponse {
  error?: string
  message: string
  success: boolean
}

/**
 * Deletes an environment variable from Vercel
 * @param req - The request object containing environment variable deletion data
 * @returns Response with deletion status
 */
export const deleteEnvironmentVariable: PayloadHandler = async (req) => {
  try {
    const body = (await req.json?.()) || {}
    const { envVarId, projectId, teamId }: DeleteEnvVarRequest = body

    if (!envVarId || !projectId) {
      return Response.json(
        {
          message: 'Missing required fields: envVarId and projectId',
          success: false,
        } as DeleteEnvVarResponse,
        { status: 400 },
      )
    }

    // Get Vercel credentials
     
    const { teamId: vercelTeamId, vercelToken } = await getVercelCredentials(req.payload)

    if (!vercelToken) {
      return Response.json(
        {
          message: 'Vercel token not found',
          success: false,
        } as DeleteEnvVarResponse,
        { status: 500 },
      )
    }

    // Use teamId from request or fallback to credentials
    const finalTeamId = teamId || vercelTeamId

    // Delete the environment variable from Vercel using raw fetch
    const deleteUrl = `https://api.vercel.com/v9/projects/${projectId}/env/${envVarId}${finalTeamId ? `?teamId=${finalTeamId}` : ''}`

    const response = await fetch(deleteUrl, {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Vercel API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const _result = await response.json()

    void logger.envVars(`✅ Successfully deleted environment variable ${envVarId} from Vercel`, {
      envVarId,
      projectId,
      teamId: finalTeamId,
    })

    return Response.json({
      message: `Successfully deleted environment variable ${envVarId}`,
      success: true,
    } as DeleteEnvVarResponse)
  } catch (error) {
    void logger.error('Error deleting environment variable', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to delete environment variable',
        success: false,
      } as DeleteEnvVarResponse,
      { status: 500 },
    )
  }
}

/**
 * Direct function to delete environment variables without database updates
 * Used by hooks to avoid conflicts
 */
export const deleteEnvironmentVariablesDirect = async ({
  envVarIds,
  projectId,
  teamId,
  payload,
}: {
  envVarIds: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
  projectId: string
  teamId?: string
}) => {
  try {
     
    const { teamId: vercelTeamId, vercelToken } = await getVercelCredentials(payload)

    if (!vercelToken) {
      return {
        success: false,
        error: 'Vercel token not found',
      }
    }

    // Use teamId from request or fallback to credentials
    const finalTeamId = teamId || vercelTeamId

    void logger.envVars(`🗑️ Deleting ${envVarIds.length} environment variables from Vercel`, {
      envVarIds,
      projectId,
      teamId: finalTeamId,
    })

    // Delete variables in parallel for better performance
    const deletePromises = envVarIds.map(async (envVarId) => {
      try {
        const deleteUrl = `https://api.vercel.com/v9/projects/${projectId}/env/${envVarId}${finalTeamId ? `?teamId=${finalTeamId}` : ''}`

        const response = await fetch(deleteUrl, {
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Vercel API error: ${response.status} ${response.statusText} - ${errorText}`,
          )
        }

        void logger.envVars(`✅ Successfully deleted environment variable ${envVarId} from Vercel`)
        return { envVarId, success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        void logger.error(`❌ Failed to delete environment variable ${envVarId}`, {
          envVarId,
          error: errorMessage,
        })
        return { envVarId, success: false, error: errorMessage }
      }
    })

    // Wait for all deletions to complete
    const results = await Promise.all(deletePromises)

    // Count results
    const successfulDeletes = results.filter((r) => r.success).length
    const failedDeletes = results.filter((r) => !r.success).length

    void logger.envVars(
      `📊 Delete summary: ${successfulDeletes} successful, ${failedDeletes} failed`,
      {
        successfulDeletes,
        failedDeletes,
        projectId,
      },
    )

    return {
      success: true,
      results,
      successfulDeletes,
      failedDeletes,
    }
  } catch (error) {
    void logger.error('Error in deleteEnvironmentVariablesDirect', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
