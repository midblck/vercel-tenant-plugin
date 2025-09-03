import type { PayloadHandler } from 'payload'

import { logger } from '../utils/logger'
import { withErrorHandling } from '../utils/errors'
import { getVercelCredentials } from './vercelUtils'

export const syncEnvironmentVariables: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
    const { teamId, vercel } = getVercelCredentials()
    const { syncAll, tenantId } = (await req.json?.()) || {}
    const { payload } = req

    let tenants = []

    if (syncAll) {
      // Get all tenants with Vercel projects
      const tenantsResult = await payload.find({
        collection: 'tenant',
        where: {
          vercelProjectId: { exists: true },
        },
      })
      tenants = tenantsResult.docs || []
    } else if (tenantId) {
      // Get specific tenant
      const tenant = await payload.findByID({ id: tenantId, collection: 'tenant' })
      if (!tenant?.vercelProjectId) {
        return Response.json(
          { error: 'Tenant not found or missing project', success: false },
          { status: 404 },
        )
      }
      tenants = [tenant]
    } else {
      return Response.json(
        { error: 'Missing tenantId or syncAll parameter', success: false },
        { status: 400 },
      )
    }

    let totalSynced = 0
    let totalCreated = 0
    let totalUpdated = 0
    let totalSkipped = 0
    let totalSkippedInactive = 0
    const syncResults = []

    // Process each tenant with timeout protection
    for (const tenant of tenants) {
      const tenantStartTime = Date.now()
      logger.info(`Starting sync for tenant: ${tenant.name}`, {
        tenantId: tenant.id,
        tenantIndex: tenants.indexOf(tenant) + 1,
        totalTenants: tenants.length,
      })
      // Skip tenants that are not approved or inactive
      if (tenant.status !== 'approved' || tenant.isActive !== true) {
        totalSkippedInactive++
        logger.info(
          `⏭️ Skipping tenant ${tenant.name} - status: ${tenant.status}, isActive: ${tenant.isActive}`,
          {
            tenantId: tenant.id,
            tenantIsActive: tenant.isActive,
            tenantName: tenant.name,
            tenantStatus: tenant.status,
          },
        )

        syncResults.push({
          details: {
            action: 'skipped_inactive',
            tenantId: tenant.id,
            tenantIsActive: tenant.isActive,
            tenantStatus: tenant.status,
          },
          key: 'N/A',
          message: `⏭️ Skipped tenant "${tenant.name}" - status: ${tenant.status}, isActive: ${tenant.isActive}`,
          status: 'skipped_inactive',
          tenantName: tenant.name,
        })
        continue
      }

      try {
        const projectId = tenant.vercelProjectId

        // Validate project ID format
        if (!projectId || typeof projectId !== 'string' || !projectId.startsWith('prj_')) {
          logger.warn(`Invalid or missing project ID for tenant ${tenant.name}`, {
            projectId,
            projectIdType: typeof projectId,
            tenantId: tenant.id,
          })
          continue
        }

        logger.info(`Starting environment variable sync for tenant: ${tenant.name}`, {
          projectId,
          tenantId: tenant.id,
        })

        // Get environment variables from Vercel (production only)
        let envVarsResult
        try {
          envVarsResult = await vercel.projects.filterProjectEnvs({
            decrypt: 'true',
            idOrName: projectId,
            teamId: teamId || undefined,
          })
          logger.info(`Vercel API call successful for tenant ${tenant.name}`, {
            projectId,
            resultType: typeof envVarsResult,
            teamId: teamId || 'no-team',
          })
        } catch (vercelError) {
          logger.error(`Vercel API call failed for tenant ${tenant.name}`, {
            error: vercelError instanceof Error ? vercelError.message : String(vercelError),
            projectId,
            tenantId: tenant.id,
          })
          throw vercelError
        }

        // If no results, try alternative approach
        if (!envVarsResult || (Array.isArray(envVarsResult) && envVarsResult.length === 0)) {
          logger.info(
            `No environment variables found with filterProjectEnvs, trying alternative approach for tenant ${tenant.name}`,
          )

          // Try to get project details first to verify project exists
          try {
            const projects = await vercel.projects.getProjects({
              teamId: teamId || undefined,
            })
            const projectDetails = (projects as unknown as any[]).find(
              (p: any) => p.id === projectId,
            )
            if (projectDetails) {
              logger.info(`Project details retrieved for tenant ${tenant.name}`, {
                projectExists: true,
                projectId,
                projectName: projectDetails.name,
              })
            } else {
              logger.warn(`Project not found in Vercel for tenant ${tenant.name}`, {
                projectId,
                tenantId: tenant.id,
              })
            }
          } catch (projectError) {
            logger.error(`Failed to get project details for tenant ${tenant.name}`, {
              error: projectError instanceof Error ? projectError.message : String(projectError),
              projectId,
              tenantId: tenant.id,
            })
          }
        }

        // Debug the response structure
        logger.info(`Processing Vercel response for tenant ${tenant.name}:`, {
          envVarsResult,
          hasData: envVarsResult && typeof envVarsResult === 'object' && 'data' in envVarsResult,
          hasDocs: envVarsResult && typeof envVarsResult === 'object' && 'docs' in envVarsResult,
          hasEnvs: envVarsResult && typeof envVarsResult === 'object' && 'envs' in envVarsResult,
          isArray: Array.isArray(envVarsResult),
        })

        // Try different ways to extract environment variables
        let allEnvVars = []
        if (Array.isArray(envVarsResult)) {
          allEnvVars = envVarsResult
        } else if (envVarsResult && typeof envVarsResult === 'object') {
          // Try common response structures
          if ('docs' in envVarsResult && Array.isArray(envVarsResult.docs)) {
            allEnvVars = envVarsResult.docs
          } else if ('data' in envVarsResult && Array.isArray(envVarsResult.data)) {
            allEnvVars = envVarsResult.data
          } else if ('envs' in envVarsResult && Array.isArray(envVarsResult.envs)) {
            allEnvVars = envVarsResult.envs
          } else if (
            'environmentVariables' in envVarsResult &&
            Array.isArray(envVarsResult.environmentVariables)
          ) {
            allEnvVars = envVarsResult.environmentVariables
          }
        }

        // Log raw data for debugging
        logger.info(`Raw Vercel response for tenant ${tenant.name}:`, {
          isArray: Array.isArray(envVarsResult),
          projectId,
          responseKeys:
            envVarsResult && typeof envVarsResult === 'object' ? Object.keys(envVarsResult) : null,
          responseType: typeof envVarsResult,
          responseValue: envVarsResult,
          sampleData: allEnvVars.length > 0 ? allEnvVars[0] : null,
          tenantId: tenant.id,
          totalCount: allEnvVars.length,
        })

        // Filter for production environment variables only
        const envVars = allEnvVars.filter(
          (envVar) =>
            envVar.target && Array.isArray(envVar.target) && envVar.target.includes('production'),
        )

        logger.info(
          `Found ${envVars.length} production environment variables for tenant ${tenant.name} (out of ${allEnvVars.length} total)`,
        )

        // Get existing tenant-envariable record for this tenant (only one record per tenant due to unique constraint)
        const existingTenantEnvVarResult = await payload.find({
          collection: 'tenant-envariable',
          limit: 1,
          where: {
            tenant: { equals: tenant.id },
          },
        })

        const existingTenantEnvVar = existingTenantEnvVarResult.docs?.[0] || null
        const existingEnvVarsMap = new Map()

        logger.info(`Found existing tenant-envariable record for tenant ${tenant.name}`, {
          existingEnvVarsCount: existingTenantEnvVar?.envVars?.length || 0,
          hasExistingRecord: !!existingTenantEnvVar,
          tenantId: tenant.id,
        })

        // If tenant has existing record, create map for quick lookup: key -> env var object
        if (existingTenantEnvVar && existingTenantEnvVar.envVars) {
          existingTenantEnvVar.envVars.forEach((envVar: any) => {
            existingEnvVarsMap.set(envVar.key, envVar)
          })
          logger.info(
            `Created lookup map with ${existingEnvVarsMap.size} existing environment variables`,
          )
        } else {
          logger.info(
            `No existing environment variables found for tenant ${tenant.name} - all variables will be treated as new`,
          )
        }

        // Process all environment variables for this tenant
        const envVarsToAdd = []
        const envVarsToUpdate = []
        const envVarsToSkip = []

        logger.info(
          `Starting categorization of ${envVars.length} environment variables for tenant ${tenant.name}`,
          {
            existingEnvVarsCount: existingEnvVarsMap.size,
            tenantId: tenant.id,
            vercelEnvVarsCount: envVars.length,
          },
        )

        // Categorize environment variables
        for (const vercelEnvVar of envVars) {
          try {
            const existingEnvVar = existingEnvVarsMap.get(vercelEnvVar.key)

            if (existingEnvVar) {
              if (existingEnvVar.vercelId === vercelEnvVar.id) {
                // Same key and vercelId - skip (don't update value)
                envVarsToSkip.push(vercelEnvVar)
                logger.info(`Categorized ${vercelEnvVar.key} as SKIP (already synced)`, {
                  key: vercelEnvVar.key,
                  vercelId: vercelEnvVar.id,
                })
              } else {
                // Same key but different vercelId - need to update vercelId
                envVarsToUpdate.push(vercelEnvVar)
                logger.info(`Categorized ${vercelEnvVar.key} as UPDATE (vercelId changed)`, {
                  key: vercelEnvVar.key,
                  newVercelId: vercelEnvVar.id,
                  oldVercelId: existingEnvVar.vercelId,
                })
              }
            } else {
              // New environment variable - need to add
              envVarsToAdd.push(vercelEnvVar)
              logger.info(`Categorized ${vercelEnvVar.key} as ADD (new variable)`, {
                key: vercelEnvVar.key,
                vercelId: vercelEnvVar.id,
              })
            }
          } catch (categorizationError) {
            logger.error(`Error categorizing environment variable ${vercelEnvVar.key}`, {
              error:
                categorizationError instanceof Error
                  ? categorizationError.message
                  : String(categorizationError),
              key: vercelEnvVar.key,
              tenantId: tenant.id,
            })
            // Continue processing other variables
          }
        }

        logger.info(`Completed categorization for tenant ${tenant.name}`, {
          tenantId: tenant.id,
          toAdd: envVarsToAdd.length,
          toSkip: envVarsToSkip.length,
          toUpdate: envVarsToUpdate.length,
        })

        // Process skipped environment variables
        logger.info(
          `Processing ${envVarsToSkip.length} skipped environment variables for tenant ${tenant.name}`,
        )
        for (const vercelEnvVar of envVarsToSkip) {
          totalSkipped++
          syncResults.push({
            details: {
              action: 'skipped',
              tenantId: tenant.id,
              vercelId: vercelEnvVar.id,
            },
            key: vercelEnvVar.key,
            message: `⏭️ Skipped env var "${vercelEnvVar.key}" for tenant "${tenant.name}" (already synced)`,
            status: 'skipped',
            tenantName: tenant.name,
          })
        }

        // Process environment variables that need vercelId updates
        logger.info(
          `Processing ${envVarsToUpdate.length} environment variables that need vercelId updates for tenant ${tenant.name}`,
        )
        for (const vercelEnvVar of envVarsToUpdate) {
          try {
            // Only process updates if we have an existing record
            if (!existingTenantEnvVar || !existingTenantEnvVar.envVars) {
              logger.warn(
                `Cannot update vercelId for ${vercelEnvVar.key} - no existing record found`,
                {
                  key: vercelEnvVar.key,
                  tenantId: tenant.id,
                },
              )
              continue
            }

            // Find the existing env var in the array and update its vercelId
            const envVarIndex = existingTenantEnvVar.envVars.findIndex(
              (env: any) => env.key === vercelEnvVar.key,
            )
            if (envVarIndex !== -1) {
              existingTenantEnvVar.envVars[envVarIndex].vercelId = vercelEnvVar.id
              logger.info(`Updated vercelId for ${vercelEnvVar.key}`, {
                key: vercelEnvVar.key,
                newVercelId: vercelEnvVar.id,
              })
            } else {
              logger.warn(
                `Could not find ${vercelEnvVar.key} in existing record to update vercelId`,
                {
                  key: vercelEnvVar.key,
                  tenantId: tenant.id,
                },
              )
            }

            totalUpdated++
            syncResults.push({
              details: {
                action: 'updated_vercel_id',
                tenantId: tenant.id,
                vercelId: vercelEnvVar.id,
              },
              key: vercelEnvVar.key,
              message: `🔄 Updated vercelId for env var "${vercelEnvVar.key}" for tenant "${tenant.name}"`,
              status: 'updated',
              tenantName: tenant.name,
            })
          } catch (updateError) {
            logger.error(
              `Error updating vercelId for env var ${vercelEnvVar.key} for tenant ${tenant.name}`,
              {
                envVarKey: vercelEnvVar.key,
                error: updateError instanceof Error ? updateError.message : String(updateError),
                tenantId: tenant.id,
              },
            )
          }
        }

        // Process new environment variables
        logger.info(
          `Processing ${envVarsToAdd.length} new environment variables for tenant ${tenant.name}`,
        )

        // Transform envVarsToAdd to contain processed newEnvVar objects
        const processedNewEnvVars = []

        for (const vercelEnvVar of envVarsToAdd) {
          try {
            const newEnvVar = {
              type: vercelEnvVar.type || 'plain',
              comment: vercelEnvVar.comment || '',
              isEncrypted: vercelEnvVar.type === 'encrypted',
              key: vercelEnvVar.key,
              targets: (vercelEnvVar.target || ['production']).map((t: any) => ({ target: t })),
              value: vercelEnvVar.value || '',
              vercelId: vercelEnvVar.id,
            }

            logger.info(`Processing new environment variable ${vercelEnvVar.key}`, {
              type: newEnvVar.type,
              hasExistingRecord: !!existingTenantEnvVar,
              key: vercelEnvVar.key,
            })

            if (existingTenantEnvVar) {
              // Add to existing record's envVars array
              if (!existingTenantEnvVar.envVars) {
                existingTenantEnvVar.envVars = []
              }
              existingTenantEnvVar.envVars.push(newEnvVar)
              logger.info(`Added ${vercelEnvVar.key} to existing record`, {
                key: vercelEnvVar.key,
                totalEnvVars: existingTenantEnvVar.envVars.length,
              })
            } else {
              // Add to processed array for new record creation
              processedNewEnvVars.push(newEnvVar)
              logger.info(`Prepared ${vercelEnvVar.key} for new record creation`, {
                type: newEnvVar.type,
                key: vercelEnvVar.key,
              })
            }

            totalCreated++
            syncResults.push({
              details: {
                action: 'created',
                tenantId: tenant.id,
                vercelId: vercelEnvVar.id,
              },
              key: vercelEnvVar.key,
              message: `✅ Created new env var "${vercelEnvVar.key}" for tenant "${tenant.name}"`,
              status: 'created',
              tenantName: tenant.name,
            })
          } catch (createError) {
            logger.error(`Error creating env var ${vercelEnvVar.key} for tenant ${tenant.name}`, {
              envVarKey: vercelEnvVar.key,
              error: createError instanceof Error ? createError.message : String(createError),
              tenantId: tenant.id,
            })
          }
        }

        // Save the updated/created record with timeout protection
        try {
          logger.info(`Starting database save operation for tenant ${tenant.name}`, {
            hasExistingRecord: !!existingTenantEnvVar,
            newEnvVarsCount: processedNewEnvVars.length,
            tenantId: tenant.id,
          })

          // Add timeout wrapper for database operations
          const saveWithTimeout = async (operation: () => Promise<any>, timeoutMs = 30000) => {
            return Promise.race([
              operation(),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Database operation timed out after ${timeoutMs}ms`)),
                  timeoutMs,
                ),
              ),
            ])
          }

          if (existingTenantEnvVar) {
            // Update existing record with new environment variables
            logger.info(`Updating existing record for tenant ${tenant.name}`, {
              envVarsCount: existingTenantEnvVar.envVars.length,
              recordId: existingTenantEnvVar.id,
            })

            await saveWithTimeout(async () => {
              return payload.update({
                id: existingTenantEnvVar.id,
                collection: 'tenant-envariable',
                context: {
                  isSystemOperation: true,
                  skipHooks: true,
                },
                data: {
                  envVarCount: existingTenantEnvVar.envVars.length,
                  envVars: existingTenantEnvVar.envVars,
                  lastSynced: new Date().toISOString(),
                  lastSyncMessage: `✅ Updated environment variables from Vercel sync`,
                  lastSyncStatus: 'synced',
                  lastUpdated: new Date().toISOString(),
                },
              })
            })

            logger.info(`Successfully updated existing record for tenant ${tenant.name}`)
          } else if (processedNewEnvVars.length > 0) {
            // Create new record with all environment variables
            logger.info(`Creating new record for tenant ${tenant.name}`, {
              envVarsCount: processedNewEnvVars.length,
            })

            const newTenantEnvVarData = {
              environment: 'production',
              envVarCount: processedNewEnvVars.length,
              envVars: processedNewEnvVars,
              lastSyncData: {
                syncedAt: new Date().toISOString(),
                totalEnvVars: processedNewEnvVars.length,
              },
              lastSynced: new Date().toISOString(),
              lastSyncMessage: `✅ New environment variables created from Vercel sync`,
              lastSyncStatus: 'synced',
              lastUpdated: new Date().toISOString(),
              tenant: tenant.id,
            }

            await saveWithTimeout(async () => {
              return payload.create({
                collection: 'tenant-envariable',
                context: {
                  isSystemOperation: true,
                  skipHooks: true,
                },
                data: newTenantEnvVarData,
              })
            })

            logger.info(`Successfully created new record for tenant ${tenant.name}`)
          } else {
            logger.info(`No database changes needed for tenant ${tenant.name}`)
          }
        } catch (saveError) {
          logger.error(
            `Error saving tenant environment variable record for tenant ${tenant.name}`,
            {
              error: saveError instanceof Error ? saveError.message : String(saveError),
              errorType: saveError instanceof Error ? saveError.constructor.name : typeof saveError,
              tenantId: tenant.id,
            },
          )

          // Don't throw the error - continue with other tenants
          // This prevents one tenant's save failure from stopping the entire sync
        }

        totalSynced = envVars.length

        const tenantEndTime = Date.now()
        const tenantDuration = tenantEndTime - tenantStartTime

        logger.info(`Completed environment variable sync for tenant: ${tenant.name}`, {
          duration: `${tenantDuration}ms`,
          tenantId: tenant.id,
          totalCreated,
          totalSkipped,
          totalSynced,
          totalUpdated,
        })
      } catch (tenantError) {
        logger.error(`Error syncing environment variables for tenant ${tenant.name}`, {
          error: tenantError instanceof Error ? tenantError.message : String(tenantError),
          tenantId: tenant.id,
        })

        syncResults.push({
          details: {
            error: tenantError instanceof Error ? tenantError.message : 'Unknown error',
            tenantId: tenant.id,
          },
          key: 'N/A',
          message: `❌ Failed to sync environment variables for tenant "${tenant.name}"`,
          status: 'error',
          tenantName: tenant.name,
        })
      }
    }

    const message = `🎯 Environment Variables Sync completed: ${totalCreated} new env vars created, ${totalUpdated} vercelIds updated, ${totalSkipped} skipped, ${totalSkippedInactive} inactive tenants skipped, ${totalSynced} total processed`

    return Response.json({
      data: {
        newEnvVars: totalCreated,
        skippedInactiveTenants: totalSkippedInactive,
        totalEnvVars: totalSynced,
        totalTenants: tenants.length,
        updatedEnvVars: totalUpdated,
      },
      message,
      success: true,
      summary: {
        newEnvVars: totalCreated,
        skippedEnvVars: totalSkipped,
        skippedInactiveTenants: totalSkippedInactive,
        successRate:
          tenants.length > 0 ? Math.round(((totalCreated + totalUpdated) / totalSynced) * 100) : 0,
        totalEnvVars: totalSynced,
        totalTenants: tenants.length,
        updatedEnvVars: totalUpdated,
      },
      syncResults,
      toastMessages: [
        {
          type: 'success',
          details: {
            newEnvVars: totalCreated,
            skippedEnvVars: totalSkipped,
            updatedEnvVars: totalUpdated,
          },
          title: 'Environment Variables Sync Completed',
        },
      ],
      total: tenants.length,
    })
  }, 'syncEnvironmentVariables')
}
