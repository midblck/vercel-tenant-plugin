/* eslint-disable perfectionist/sort-objects */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadHandler } from 'payload'

import { getVercelCredentialsForTenant } from './vercelUtils'
import { logger } from '../utils/logger'

interface UpdateEnvVarRequest {
  envVarKey: string
  tenantId: string
  updates: {
    comment?: string
    gitBranch?: string
    target?: string[]
    type?: 'encrypted' | 'plain' | 'secret' | 'system'
    value?: string
  }
}

interface UpdateEnvVarResponse {
  error?: string
  message: string
  secretGenerated?: boolean
  success: boolean
  updatedEnvVar?: any
}

/**
 * Updates an existing environment variable on Vercel
 * Automatically generates secrets for encrypted fields if value is empty
 * Falls back to CREATE if vercelId is missing
 * @param req - The request object containing environment variable updates
 * @returns Response with update status and updated environment variable data
 */
export const updateEnvironmentVariable: PayloadHandler = async (req) => {
  try {
    const body = (await req.json?.()) || {}
    const { envVarKey, tenantId, updates }: UpdateEnvVarRequest = body

    if (!tenantId || !envVarKey) {
      return Response.json(
        {
          message: 'Missing required fields: tenantId and envVarKey',
          success: false,
        } as UpdateEnvVarResponse,
        { status: 400 },
      )
    }

    const { payload } = req

    // Find the tenant to get project information
    const tenant = await payload.findByID({
      id: tenantId,
      collection: 'tenant',
    })

    if (!tenant) {
      return Response.json(
        {
          message: `Tenant ${tenantId} not found`,
          success: false,
        } as UpdateEnvVarResponse,
        { status: 404 },
      )
    }

    if (!tenant.vercelProjectId || !tenant.vercelProjectUrl) {
      return Response.json(
        {
          message: 'Tenant missing Vercel project information',
          success: false,
        } as UpdateEnvVarResponse,
        { status: 400 },
      )
    }

    // Find the tenant-envariable record
    const envVarsRecord = await payload.find({
      collection: 'tenant-envariable',
      where: {
        environment: { equals: 'production' },
        tenant: { equals: tenantId },
      },
    })

    if (envVarsRecord.docs.length === 0) {
      return Response.json(
        {
          message: 'No environment variables record found for this tenant',
          success: false,
        } as UpdateEnvVarResponse,
        { status: 404 },
      )
    }

    const record = envVarsRecord.docs[0]
    const envVar = record.envVars?.find((env: any) => env.key === envVarKey)

    if (!envVar) {
      // Environment variable not found
      return Response.json(
        {
          message: `Environment variable ${envVarKey} not found`,
          success: false,
        } as UpdateEnvVarResponse,
        { status: 404 },
      )
    }

    // Check if we have a vercelId for UPDATE operation
    if (!envVar.vercelId || envVar.vercelId === 'undefined' || envVar.vercelId === 'null') {
      // No valid vercelId found, falling back to CREATE operation

      // FALLBACK TO CREATE: Call createEnvironmentVariables endpoint internally
      try {
        const { createEnvironmentVariables } = await import('./createEnvironmentVariables')

        // Create a mock request object for the CREATE endpoint
        const createRequest = {
          json: () =>
            Promise.resolve({
              existingEnvVars: [
                {
                  ...envVar,
                  ...updates,
                  // Generate secret if encrypted and no value
                  ...((updates.type === 'encrypted' || envVar.type === 'encrypted') &&
                    (!updates.value || updates.value === '') && {
                      value: null, // This will trigger secret generation in CREATE
                    }),
                },
              ],
              tenantId,
            }),
          payload,
        } as any

        const createResult = await createEnvironmentVariables(createRequest)

        if (createResult.status === 200) {
          const createData = await createResult.json()

          if (createData.success && createData.results?.[0]?.processedEnvVars) {
            // Find the updated variable with vercelId
            const updatedVar = createData.results[0].processedEnvVars.find(
              (v: any) => v.key === envVarKey,
            )

            if (updatedVar && updatedVar.vercelId) {
              // Update the database record with the new vercelId
              const _updatedEnvVars = record.envVars.map((env: any) => {
                if (env.key === envVarKey) {
                  return {
                    ...env,
                    ...updates,
                    vercelId: updatedVar.vercelId,
                    value: updatedVar.value,
                    // Update targets if provided
                    ...(updates.target && {
                      targets: updates.target.map((t) => ({ target: t })),
                    }),
                  }
                }
                return env
              })

              // Database updates are handled by the hook when needed

              return Response.json({
                message: `Successfully created environment variable ${envVarKey} (was missing vercelId)`,
                secretGenerated: updatedVar.type === 'encrypted',
                success: true,
                updatedEnvVar: {
                  ...envVar,
                  ...updates,
                  vercelId: updatedVar.vercelId,
                  value: updatedVar.value,
                },
              } as UpdateEnvVarResponse)
            }
          }
        }

        // If CREATE failed, throw error to fail entire operation
        throw new Error('CREATE fallback failed during UPDATE operation')
      } catch (createError) {
        // Use proper error logging instead of console.error
        // Note: In production, this should use a proper logger
        // console.error('[VERCEL] CREATE fallback failed:', createError)
        return Response.json(
          {
            error: `CREATE fallback failed: ${createError instanceof Error ? createError.message : 'Unknown error'}`,
            message: 'Failed to create environment variable during UPDATE fallback',
            success: false,
          } as UpdateEnvVarResponse,
          { status: 500 },
        )
      }
    }

    // PROCEED WITH UPDATE: We have a vercelId, so update existing variable

    // Get Vercel credentials for this specific tenant
    let teamId, vercelToken, source, isValid
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const credentials = await getVercelCredentialsForTenant(req.payload, tenantId)
      teamId = credentials.teamId
      vercelToken = credentials.vercelToken
      source = credentials.source
      isValid = credentials.isValid

      void logger.info(`Using credentials for environment variable update`, {
        source: source,
        isValid: isValid,
        tenantId: tenantId,
      })
    } catch (error) {
      void logger.error(
        `Failed to get tenant-specific credentials for environment variable update`,
        {
          tenantId: tenantId,
          error: error instanceof Error ? error.message : String(error),
        },
      )
      return Response.json(
        {
          message: `Failed to get Vercel credentials for tenant ${tenantId}`,
          success: false,
        } as UpdateEnvVarResponse,
        { status: 500 },
      )
    }

    // Generate secret if value is null/empty and type is encrypted
    let valueToSend = updates.value !== undefined ? updates.value : envVar.value
    let secretGenerated = false

    if (
      (valueToSend === null || valueToSend === undefined || valueToSend === '') &&
      (updates.type === 'encrypted' || envVar.type === 'encrypted')
    ) {
      // Import the generateSecret function
      const { generateSecret } = await import('./createEnvironmentVariables')
      valueToSend = generateSecret(32)
      secretGenerated = true
    }

    // Update the environment variable in Vercel using raw fetch
    const updateUrl = `https://api.vercel.com/v9/projects/${tenant.vercelProjectId}/env/${envVar.vercelId}${teamId ? `?teamId=${teamId}` : ''}`

    const requestBody = {
      type: updates.type || envVar.type,
      comment: updates.comment !== undefined ? updates.comment : envVar.comment,
      gitBranch: updates.gitBranch || envVar.gitBranch,
      key: envVar.key,
      target: updates.target ||
        envVar.targets?.map((t: any) => t.target) || ['production', 'preview', 'development'],
      value: valueToSend,
    }

    const response = await fetch(updateUrl, {
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Vercel API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const _result = await response.json()

    // REMOVED: Database update to prevent conflicts
    // Variables with vercelId are updated on Vercel only
    // Database updates are handled by the hook when needed

    // Return the updated data for the hook to handle
    const responseMessage = secretGenerated
      ? `Successfully updated environment variable ${envVarKey} with auto-generated secret`
      : `Successfully updated environment variable ${envVarKey}`

    return Response.json({
      message: responseMessage,
      secretGenerated,
      success: true,
      updatedEnvVar: {
        ...envVar,
        ...updates,
        value: valueToSend,
        // Update targets if provided
        ...(updates.target && {
          targets: updates.target.map((t) => ({ target: t })),
        }),
      },
    } as UpdateEnvVarResponse)
  } catch (error) {
    void logger.error('Error updating environment variable', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update environment variable',
        success: false,
      } as UpdateEnvVarResponse,
      { status: 500 },
    )
  }
}
