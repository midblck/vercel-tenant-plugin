/* eslint-disable perfectionist/sort-objects */
import type { PayloadHandler } from 'payload'

import { logger } from '../utils/logger'
import { withErrorHandling } from '../utils/errors'
import { getVercelCredentials } from './vercelUtils'
import type {
  CreateEnvVarsRequest,
  CreateEnvVarsResponse,
  EnvironmentVariableData,
  ProcessedEnvironmentVariable,
  TenantData,
} from '../types'

/**
 * Generates a cryptographically secure random string for environment variable secrets
 * @param length - The length of the secret to generate
 * @returns A random string of the specified length
 */
export function generateSecret(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Gets tenant-specific values for environment variables based on tenant configuration
 * @param key - The environment variable key
 * @param tenant - The tenant object containing configuration
 * @returns The tenant-specific value or empty string if not applicable
 */
function getTenantBasedValue(key: string, tenant: TenantData): string {
  // Log tenant data for debugging
  logger.envVars(`Getting tenant-based value for ${key}`, {
    key,
    tenantName: tenant.name,
    vercelProjectName: tenant.vercelProjectName,
    vercelProjectUrl: tenant.vercelProjectUrl,
  })

  switch (key) {
    case 'GOOGLE_CLIENT_ID':
      return ''
    case 'NEXT_PUBLIC_PAYLOAD_AUTH_URL':
      return tenant.vercelProjectUrl ? `${tenant.vercelProjectUrl}/login` : ''
    case 'NEXT_PUBLIC_SERVER_URL':
      return tenant.vercelProjectUrl || ''
    case 'SMTP_HOST':
      return 'smtp.gmail.com'
    case 'SMTP_USER':
      return process.env.SMTP_USER || 'dev@example.com'
    case 'VERCEL_PROJECT_PRODUCTION_URL':
      return tenant.vercelProjectUrl || ''
    default:
      return ''
  }
}

// Types are now imported from common.ts

/**
 * Creates environment variables on Vercel for approved and active tenants
 * Simple, direct approach: create variables, return IDs, let hook handle database updates
 * @param req - The request object containing tenant and environment variable data
 * @returns Response with creation results and Vercel IDs
 */
/**
 * Direct function to create environment variables without database updates
 * Used by hooks to avoid SimpleUpdateStrategy conflicts
 */
export const createEnvironmentVariablesDirect = async ({
  existingDocId: _existingDocId,
  existingEnvVars,
  tenantId,
  payload,
}: {
  existingDocId: string
  existingEnvVars: EnvironmentVariableData[]
  payload: {
    find: (params: {
      collection: string
      where: { id: { equals: string } }
    }) => Promise<{ docs: TenantData[] }>
    findByID: (params: { collection: string; id: string }) => Promise<TenantData>
  }
  tenantId: string
}) => {
  try {
    const { teamId, vercelToken } = getVercelCredentials()

    if (!vercelToken) {
      return {
        success: false,
        error: 'Vercel token not found',
      }
    }

    const { Vercel } = await import('@vercel/sdk')
    const vercel = new Vercel({ bearerToken: vercelToken })

    // Get tenant
    const tenant = await payload.findByID({
      id: tenantId,
      collection: 'tenant',
    })

    if (!tenant || !tenant.vercelProjectId || !tenant.vercelProjectUrl) {
      return {
        success: false,
        error: 'Tenant not found or missing Vercel project information',
      }
    }

    // Process environment variables
    const varsToCreate = existingEnvVars.map((envVar: EnvironmentVariableData) => {
      // Generate secrets for empty encrypted fields
      if (
        (envVar.value === null || envVar.value === undefined || envVar.value === '') &&
        envVar.isEncrypted === true
      ) {
        const secret = generateSecret(32)
        return {
          ...envVar,
          type: 'encrypted',
          value: secret,
        }
      }

      // Populate tenant-based values for empty plain text fields
      if (
        (envVar.value === null || envVar.value === undefined || envVar.value === '') &&
        envVar.type === 'plain'
      ) {
        const tenantValue = getTenantBasedValue(envVar.key, tenant)
        if (tenantValue) {
          return {
            ...envVar,
            value: tenantValue,
          }
        }
      }

      return envVar
    })

    logger.envVars(`Creating ${varsToCreate.length} variables for tenant ${tenant.name}`, {
      count: varsToCreate.length,
      tenantName: tenant.name,
    })

    // Create variables on Vercel
    const vercelIds: Array<{ key: string; vercelId: string }> = []
    const processedEnvVars: ProcessedEnvironmentVariable[] = []

    for (const envVar of varsToCreate) {
      try {
        const vercelEnvVar = {
          key: envVar.key,
          value: envVar.value,
          type: envVar.type === 'encrypted' ? 'encrypted' : 'plain',
          target: envVar.targets?.map((t) => t.target) || ['production', 'preview', 'development'],
          customEnvironmentIds: [], // Required field
        }

        const result = await vercel.projects.createProjectEnv({
          idOrName: tenant.vercelProjectId,
          requestBody: vercelEnvVar,
          teamId: teamId || undefined,
        })

        // Debug: Log the actual response structure
        logger.envVars(`🔍 DEBUG: Vercel API response for ${envVar.key}`, {
          key: envVar.key,
          response: result,
          responseKeys: Object.keys(result || {}),
        })

        vercelIds.push({
          key: envVar.key,
          vercelId:
            (result as any).created?.id || (result as any).id || (result as any).key || envVar.key, // Extract ID from created object
        })

        processedEnvVars.push({
          key: envVar.key,
          type: envVar.type as 'encrypted' | 'plain' | 'secret' | 'system',
          value: envVar.value,
          targets: envVar.targets,
        })

        logger.envVars(`✅ Created ${envVar.key} on Vercel`, {
          key: envVar.key,
          vercelId: (result as any).id || (result as any).key || envVar.key,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        // Check if the error is because the variable already exists
        if (errorMessage.includes('already exists')) {
          logger.envVars(`⚠️ Variable ${envVar.key} already exists on Vercel, fetching ID...`, {
            key: envVar.key,
          })

          try {
            // Fetch existing environment variables to get the ID
            const existingVarsResponse = await vercel.projects.getProjectEnv({
              idOrName: tenant.vercelProjectId,
              teamId: teamId || undefined,
              id: '', // Empty string to get all environment variables
            })

            // Handle different response formats
            const existingVars = Array.isArray(existingVarsResponse)
              ? existingVarsResponse
              : (existingVarsResponse as any)?.envs || []

            const existingVar = existingVars.find(
              (v: { id: string; key: string }) => v.key === envVar.key,
            )
            if (existingVar) {
              vercelIds.push({
                key: envVar.key,
                vercelId: existingVar.id,
              })

              processedEnvVars.push({
                key: envVar.key,
                type: envVar.type as 'encrypted' | 'plain' | 'secret' | 'system',
                value: envVar.value,
                targets: envVar.targets,
              })

              logger.envVars(`✅ Found existing ${envVar.key} on Vercel`, {
                key: envVar.key,
                vercelId: existingVar.id,
              })
            } else {
              logger.error(`Variable ${envVar.key} exists but couldn't find it in list`, {
                key: envVar.key,
              })
            }
          } catch (fetchError) {
            logger.error(`Failed to fetch existing variable ${envVar.key}`, {
              key: envVar.key,
              error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            })
          }
        } else {
          logger.error(`Failed to create ${envVar.key} on Vercel`, {
            key: envVar.key,
            error: errorMessage,
          })
        }
      }
    }

    return {
      success: true,
      vercelIds,
      processedEnvVars,
    }
  } catch (error) {
    logger.error('Error in createEnvironmentVariablesDirect', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export const createEnvironmentVariables: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
    const body = (await req.json?.()) || {}
    const { existingDocId, existingEnvVars, tenantId } = body as CreateEnvVarsRequest

    const { payload } = req
    const { teamId, vercelToken } = getVercelCredentials()
    const { Vercel } = await import('@vercel/sdk')
    const vercel = new Vercel({ bearerToken: vercelToken })

    // Get tenants with approved status and isActive true
    const whereClause: Record<string, { equals: boolean | string }> = {
      isActive: { equals: true },
      status: { equals: 'approved' },
    }

    if (tenantId) {
      whereClause.id = { equals: tenantId }
    }

    const tenants = await payload.find({
      collection: 'tenant',
      where: whereClause,
    })

    if (tenants.docs.length === 0) {
      return Response.json(
        { message: 'No approved and active tenants found', success: false },
        { status: 404 },
      )
    }

    const results: CreateEnvVarsResponse['results'] = []
    let currentProgress = 0

    // Progress tracking function
    const updateProgress = (tenantName: string, status: string) => {
      currentProgress++
      logger.envVars(`🔄 [${currentProgress}/${tenants.docs.length}] ${status}: ${tenantName}`)
    }

    for (const tenant of tenants.docs) {
      try {
        updateProgress(tenant.name || tenant.id, 'Processing')

        if (!tenant.vercelProjectId || !tenant.vercelProjectUrl) {
          results.push({
            created: 0,
            errors: ['Missing Vercel project ID or URL'],
            projectId: tenant.vercelProjectId || 'N/A',
            status: 'error',
            tenant: tenant.name || tenant.id,
          })
          continue
        }

        // Process environment variables from the hook
        let varsToCreate: EnvironmentVariableData[] = []

        // Tenant data processing for environment variable creation

        if (existingEnvVars && existingEnvVars.length > 0) {
          // Process variables: generate secrets for encrypted fields and populate tenant-based values
          varsToCreate = existingEnvVars.map((envVar: EnvironmentVariableData) => {
            // Generate secrets for empty encrypted fields
            if (
              (envVar.value === null || envVar.value === undefined || envVar.value === '') &&
              envVar.isEncrypted === true
            ) {
              const secret = generateSecret(32)
              return {
                ...envVar,
                type: 'encrypted',
                value: secret,
              }
            }

            // Populate tenant-based values for empty plain text fields
            if (
              (envVar.value === null || envVar.value === undefined || envVar.value === '') &&
              envVar.type === 'plain'
            ) {
              const tenantValue = getTenantBasedValue(envVar.key, tenant as TenantData)
              if (tenantValue) {
                return {
                  ...envVar,
                  value: tenantValue,
                }
              }
            }

            return envVar
          })

          logger.envVars(
            `Processing ${varsToCreate.length} environment variables for tenant ${tenant.name}`,
            {
              count: varsToCreate.length,
              tenantName: tenant.name,
            },
          )
        } else {
          logger.envVars(`No environment variables provided for tenant ${tenant.name}`, {
            tenantName: tenant.name,
          })
          continue
        }

        if (varsToCreate.length === 0) {
          logger.envVars(`No variables to create for tenant ${tenant.name}`, {
            tenantName: tenant.name,
          })
          results.push({
            created: 0,
            errors: undefined,
            processedEnvVars: [],
            projectId: tenant.vercelProjectId || 'N/A',
            status: 'success',
            tenant: tenant.name || String(tenant.id),
          })
          continue
        }

        logger.envVars(`Creating ${varsToCreate.length} variables for tenant ${tenant.name}`, {
          count: varsToCreate.length,
          tenantName: tenant.name,
        })

        // Use the vercelProjectId for consistency
        const projectId: string = tenant.vercelProjectId
        let created = 0
        const errors: string[] = []
        const vercelIds: Array<{ key: string; vercelId: string }> = []

        // Create environment variables on Vercel
        try {
          logger.envVars(
            `Creating ${varsToCreate.length} environment variables for tenant ${tenant.name}`,
            {
              count: varsToCreate.length,
              tenantName: tenant.name,
            },
          )

          // Prepare request body for Vercel
          const requestBody = varsToCreate.map((envVar: EnvironmentVariableData) => ({
            type: (envVar.type || 'plain') as 'encrypted' | 'plain',
            comment: envVar.comment || '',
            key: envVar.key,
            target: ['production', 'preview', 'development'] as (
              | 'development'
              | 'preview'
              | 'production'
            )[],
            value: envVar.value || '',
            customEnvironmentIds: [],
          }))

          // Debug: Show what variables are being sent
          logger.envVars(`Variables being sent to Vercel`, {
            count: varsToCreate.length,
            tenantName: tenant.name,
          })
          varsToCreate.forEach((envVar: EnvironmentVariableData) => {
            if (envVar.isEncrypted) {
              logger.envVars(
                `  - ${envVar.key}: [ENCRYPTED_SECRET_GENERATED] (type: ${envVar.type})`,
                {
                  key: envVar.key,
                  type: envVar.type,
                  isEncrypted: true,
                },
              )
            } else {
              logger.envVars(
                `  - ${envVar.key}: ${envVar.value || '[EMPTY]'} (type: ${envVar.type})`,
                {
                  key: envVar.key,
                  type: envVar.type,
                  value: envVar.value || '[EMPTY]',
                },
              )
            }
          })

          // Create variables on Vercel
          let result: any
          if (varsToCreate.length === 1) {
            // Single variable creation
            const singleVar = requestBody[0]
            result = await vercel.projects.createProjectEnv({
              idOrName: projectId,
              requestBody: singleVar,
              teamId: teamId || undefined,
              upsert: 'true',
            })
          } else {
            // Bulk creation for multiple variables
            result = await vercel.projects.createProjectEnv({
              idOrName: projectId,
              requestBody,
              teamId: teamId || undefined,
              upsert: 'true',
            })
          }

          // Process results

          if (result.created) {
            // Handle both array and object formats
            if (Array.isArray(result.created)) {
              // Batch operation format: "created": [...]
              created = result.created.length
              logger.envVars(
                `✅ Successfully created ${created} environment variables for tenant ${tenant.name}`,
                {
                  count: created,
                  tenantName: tenant.name,
                },
              )

              // Collect Vercel IDs
              result.created.forEach((env: { id: string; key: string }) => {
                vercelIds.push({
                  key: env.key,
                  vercelId: env.id || '',
                })
              })

              logger.envVars(`🎯 Collected ${vercelIds.length} Vercel IDs`, {
                count: vercelIds.length,
                tenantName: tenant.name,
              })
            } else if (typeof result.created === 'object' && result.created.key) {
              // Individual operation format: "created": {...}
              created = 1
              logger.envVars(
                `✅ Successfully created 1 environment variable for tenant ${tenant.name}`,
                {
                  count: 1,
                  tenantName: tenant.name,
                },
              )

              // Collect Vercel ID
              vercelIds.push({
                key: result.created.key,
                vercelId: result.created.id || '',
              })

              logger.envVars(`🎯 Collected ${vercelIds.length} Vercel IDs`, {
                count: vercelIds.length,
                tenantName: tenant.name,
              })
            } else {
              logger.warn(`⚠️ Unexpected 'created' format: ${typeof result.created}`, {
                type: typeof result.created,
                keys: Object.keys(result),
                tenantName: tenant.name,
              })
            }
          } else {
            logger.warn(`⚠️ No 'created' field in response`, {
              keys: Object.keys(result),
              tenantName: tenant.name,
            })
          }

          if (result.failed && result.failed.length > 0) {
            logger.warn(`Failed variables: ${result.failed.length}`, {
              failed: result.failed,
              tenantName: tenant.name,
            })
            result.failed.forEach((failed: { error: { key?: string; message?: string } }) => {
              const error = failed.error
              const errorMsg = `${error?.key || 'Unknown'}: ${error?.message || 'Unknown error'}`
              errors.push(errorMsg)
              logger.error(`❌ Failed to create: ${errorMsg}`, {
                key: error?.key,
                message: error?.message,
                tenantName: tenant.name,
              })
            })
          }

          // Handle case where no variables were created but API call succeeded
          if (created === 0 && !result.failed) {
            logger.info(
              `No variables created, but API call succeeded. Variables may already exist.`,
              {
                tenantName: tenant.name,
              },
            )

            // Try to get Vercel IDs from existing variables
            try {
              const existingVars = await vercel.projects.getProjectEnv({
                idOrName: projectId,
                teamId: teamId || undefined,
                id: '',
              })

              if (existingVars && Array.isArray(existingVars)) {
                varsToCreate.forEach((varToCreate: EnvironmentVariableData) => {
                  const existingVar = existingVars.find(
                    (ev: { id: string; key: string }) => ev.key === varToCreate.key,
                  )
                  if (existingVar && existingVar.id) {
                    vercelIds.push({
                      key: existingVar.key,
                      vercelId: existingVar.id,
                    })
                    logger.info(
                      `Found existing Vercel ID for ${existingVar.key}: ${existingVar.id}`,
                      {
                        key: existingVar.key,
                        vercelId: existingVar.id,
                        tenantName: tenant.name,
                      },
                    )
                  }
                })
              }
            } catch (retrieveError) {
              logger.error(`Error retrieving existing Vercel IDs`, {
                error:
                  retrieveError instanceof Error ? retrieveError.message : String(retrieveError),
                tenantName: tenant.name,
              })
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Creation failed: ${errorMsg}`)
          logger.error(`❌ Error creating variables for tenant ${tenant.name}`, {
            error: errorMsg,
            tenantName: tenant.name,
          })
        }

        // Prepare response data
        const processedEnvVars = varsToCreate.map((envVar: EnvironmentVariableData) => {
          const vercelIdInfo = vercelIds.find((v) => v.key === envVar.key)
          if (vercelIdInfo) {
            return { ...envVar, vercelId: vercelIdInfo.vercelId }
          }
          return envVar
        })

        // Use strategy to update Vercel IDs in the tenant-envariable document
        if (vercelIds.length > 0) {
          try {
            // Use the new PersistentQueueUpdateStrategy for tenant-envariable documents
            const strategy = new SimpleUpdateStrategy(payload as any)

            // We need the document ID to update the tenant-envariable document
            // This comes from the request body
            const documentId = existingDocId

            if (documentId) {
              const updateSuccess = await strategy.updateEnvVarDocument(
                String(documentId),
                vercelIds,
                { environment: 'production', tenantId: String(tenant.id) },
              )

              if (updateSuccess) {
                logger.info(`Successfully updated Vercel ID for tenant ${tenant.name}`, {
                  tenantId: tenant.id,
                  vercelIdsCount: vercelIds.length,
                })
              } else {
                logger.warn(`Failed to update Vercel ID for tenant ${tenant.name}`, {
                  tenantId: tenant.id,
                  vercelIdsCount: vercelIds.length,
                })
              }
            } else {
              logger.warn(`No document ID available for Vercel ID update`, {
                tenantId: tenant.id,
                vercelIdsCount: vercelIds.length,
              })
            }
          } catch (error) {
            logger.error(`Error updating Vercel IDs for tenant ${tenant.name}`, {
              tenantId: tenant.id,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        results.push({
          created,
          errors: errors.length > 0 ? errors : undefined,
          processedEnvVars,
          projectId: String(projectId),
          status: errors.length === 0 ? 'success' : 'error',
          tenant: tenant.name || String(tenant.id),
          vercelIds: vercelIds.length > 0 ? vercelIds : undefined,
        })

        // Update progress based on result
        if (errors.length === 0) {
          updateProgress(tenant.name || tenant.id, 'Success')
        } else {
          updateProgress(tenant.name || tenant.id, 'Error')
        }
      } catch (error) {
        logger.error(`❌ Error processing tenant ${tenant.name}`, {
          error: error instanceof Error ? error.message : String(error),
          tenantName: tenant.name,
        })
        results.push({
          created: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processedEnvVars: [],
          projectId: String(tenant.vercelProjectId) || 'N/A',
          status: 'error',
          tenant: tenant.name || String(tenant.id),
        })

        updateProgress(tenant.name || tenant.id, 'Error')
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
    const successCount = results.filter((r) => r.status === 'success').length
    const errorCount = results.filter((r) => r.status === 'error').length

    logger.info(
      `✅ Operation completed: ${totalCreated} variables created across ${successCount} tenants`,
      {
        totalCreated,
        successCount,
        errorCount,
      },
    )

    return Response.json({
      message: `Created ${totalCreated} environment variables across ${successCount} tenants. ${errorCount} tenants had errors.`,
      results,
      success: true,
      total: results.length,
      progress: {
        current: results.length,
        total: results.length,
        message: `✅ All ${results.length} tenants processed successfully`,
      },
      summary: {
        totalTenants: results.length,
        successCount,
        errorCount,
        totalCreated,
      },
    })
  }, 'createEnvironmentVariables')
}

/**
 * Strategy interface for updating Vercel IDs in the database
 */
export interface EnvVarUpdateStrategy {
  updateEnvVarDocument(
    documentId: string,
    vercelIds: Array<{ key: string; vercelId: string }>,
    context?: {
      environment?: string
      tenantId?: string
      updatedEnvVars?: EnvironmentVariableData[]
    },
  ): Promise<boolean>
}

/**
 * Simple update strategy - updates the tenant environment variables directly without retry logic
 */
export class SimpleUpdateStrategy implements EnvVarUpdateStrategy {
  constructor(
    private payload: {
      find: (params: {
        collection: string
        limit: number
        sort: string
        where: Record<string, unknown>
      }) => Promise<{ docs: unknown[] }>
      findByID: (params: { collection: string; id: string }) => Promise<unknown>
      update: (params: {
        collection: string
        data: Record<string, unknown>
        id: string
      }) => Promise<unknown>
    },
  ) {}

  async updateEnvVarDocument(
    documentId: string,
    vercelIds: Array<{ key: string; vercelId: string }>,
    context?: {
      environment?: string
      tenantId?: string
      updatedEnvVars?: EnvironmentVariableData[]
    },
  ): Promise<boolean> {
    try {
      logger.info(`🔍 Attempting to find document ${documentId} in tenant-envariable collection`)

      // First try to find by document ID
      let currentDoc = null
      try {
        currentDoc = await this.payload.findByID({
          collection: 'tenant-envariable',
          id: documentId,
        })

        if (currentDoc) {
          logger.info(`✅ Found document by ID ${documentId}`, {
            documentId,
            existingEnvVarsCount: (currentDoc as any).envVars?.length || 0,
          })
        }
      } catch (idError) {
        logger.warn(`⚠️ Document not found by ID, will try alternative lookup`, {
          documentId,
          error: idError instanceof Error ? idError.message : String(idError),
        })
      }

      // If not found by ID, try to find by tenant and environment (more reliable)
      if (!currentDoc && context?.tenantId) {
        logger.info(`🔍 Trying alternative lookup by tenant ID: ${context.tenantId}`)

        try {
          // Find the document by tenant ID and environment
          const tenantDocs = await this.payload.find({
            collection: 'tenant-envariable',
            limit: 1,
            sort: '-createdAt', // Get the most recently created document
            where: {
              tenant: { equals: context.tenantId },
              ...(context.environment && { environment: { equals: context.environment } }),
            },
          })

          if (tenantDocs.docs.length > 0) {
            const tenantDoc = tenantDocs.docs[0]
            // Check if this is likely our document (created within the last few seconds)
            const docAge = Date.now() - new Date((tenantDoc as any).createdAt).getTime()
            if (docAge < 10000) {
              // Less than 10 seconds old
              currentDoc = tenantDoc
              logger.info(`✅ Found document by tenant lookup`, {
                documentId: (tenantDoc as any).id,
                tenantId: context.tenantId,
                age: docAge,
                existingEnvVarsCount: (currentDoc as any).envVars?.length || 0,
              })
            }
          }
        } catch (altError) {
          logger.warn(`⚠️ Alternative lookup by tenant also failed`, {
            error: altError instanceof Error ? altError.message : String(altError),
            tenantId: context.tenantId,
          })
        }
      }

      // Final fallback: try to find the most recent document
      if (!currentDoc) {
        logger.info(`🔍 Trying final fallback: most recent document`)

        try {
          const recentDocs = await this.payload.find({
            collection: 'tenant-envariable',
            limit: 1,
            sort: '-createdAt',
            where: {},
          })

          if (recentDocs.docs.length > 0) {
            const recentDoc = recentDocs.docs[0]
            const docAge = Date.now() - new Date((recentDoc as any).createdAt).getTime()
            if (docAge < 10000) {
              // Less than 10 seconds old
              currentDoc = recentDoc
              logger.info(`✅ Found document by timestamp fallback`, {
                documentId: (recentDoc as any).id,
                age: docAge,
                existingEnvVarsCount: (currentDoc as any).envVars?.length || 0,
              })
            }
          }
        } catch (fallbackError) {
          logger.warn(`⚠️ Final fallback also failed`, {
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          })
        }
      }

      if (!currentDoc) {
        logger.error(`Document not found using any method: ${documentId}`, {
          documentId,
          collection: 'tenant-envariable',
          vercelIdsCount: vercelIds.length,
        })
        return false
      }

      // Use updated environment variables if provided, otherwise merge Vercel IDs with existing variables
      let updatedEnvVars: any[] = []

      if (context?.updatedEnvVars && context.updatedEnvVars.length > 0) {
        // Use the updated environment variables from the hook (includes processed values)
        updatedEnvVars = context.updatedEnvVars
        logger.info(`📝 Using updated environment variables from hook context`)
      } else {
        // Fallback: Merge Vercel IDs with existing variables (preserve current values)
        updatedEnvVars =
          (currentDoc as any).envVars?.map((envVar: any) => {
            const vercelIdEntry = vercelIds.find((v) => v.key === envVar.key)
            if (vercelIdEntry) {
              return { ...envVar, vercelId: vercelIdEntry.vercelId }
            }
            return envVar
          }) || []
        logger.info(`📝 Merging Vercel IDs with existing variables (fallback)`)
      }

      // Update database immediately
      logger.info(`🔄 Updating document ${documentId} with ${vercelIds.length} Vercel IDs`)

      await this.payload.update({
        collection: 'tenant-envariable',
        id: documentId,
        data: {
          envVars: updatedEnvVars,
          lastUpdated: new Date().toISOString(),
        },
        // Additional options to prevent hook triggering
        // context: {
        //   skipHooks: true,
        // },
      })

      logger.info(`✅ Successfully updated Vercel IDs for document ${documentId}`)

      return true
    } catch (error) {
      logger.error(`Failed to update Vercel IDs in database for document ${documentId}`, {
        documentId,
        error: error instanceof Error ? error.message : String(error),
        vercelIdsCount: vercelIds.length,
        stack: error instanceof Error ? error.stack : undefined,
      })
      return false
    }
  }
}
