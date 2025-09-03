import type { CollectionAfterChangeHook, CollectionBeforeValidateHook } from 'payload'
import { logger } from '../utils/logger'
import type { EnvironmentVariableData, PayloadRequestWithUser, TenantData } from '../types'

// Simple flag to prevent multiple executions
let isProcessing = false

/**
 * Checks if an environment variable has actually changed by comparing with previous values
 * @param currentVar - The current environment variable
 * @param previousVars - Array of previous environment variables
 * @returns true if the variable has changed, false otherwise
 */
function hasVariableChanged(
  currentVar: EnvironmentVariableData,
  previousVars?: EnvironmentVariableData[],
): boolean {
  if (!previousVars || previousVars.length === 0) {
    // If no previous variables, consider it changed (new variable)
    return true
  }

  // Find the previous version of this variable
  const previousVar = previousVars.find(
    (prev: EnvironmentVariableData) => prev.key === currentVar.key,
  )

  if (!previousVar) {
    // Variable didn't exist before, so it's changed (new variable)
    return true
  }

  // Compare the relevant fields that would affect Vercel
  const fieldsToCompare = ['value', 'type', 'comment', 'gitBranch', 'targets']

  for (const field of fieldsToCompare) {
    const currentValue = (currentVar as unknown as Record<string, unknown>)[field]
    const previousValue = (previousVar as unknown as Record<string, unknown>)[field]

    // Handle targets array comparison
    if (field === 'targets') {
      const currentTargets =
        (currentValue as any)?.map((t: { target?: string } | string) =>
          typeof t === 'string' ? t : t.target || '',
        ) || []
      const previousTargets =
        (previousValue as any)?.map((t: { target?: string } | string) =>
          typeof t === 'string' ? t : t.target || '',
        ) || []

      // Sort arrays for comparison
      const sortedCurrent = [...currentTargets].sort()
      const sortedPrevious = [...previousTargets].sort()

      if (JSON.stringify(sortedCurrent) !== JSON.stringify(sortedPrevious)) {
        return true
      }
    } else {
      // Direct comparison for other fields
      if (currentValue !== previousValue) {
        return true
      }
    }
  }

  // No changes detected
  return false
}

/**
 * After-change hook for tenant environment variables collection
 * Handles automatic Vercel environment variable creation and updates
 *
 * STRATEGY:
 * - CREATE operations: Process all variables, create on Vercel, save IDs to database
 * - UPDATE operations: ALWAYS proceed to handle both updates and new variable creation
 * - Infinite loops are prevented by timing checks, not by blocking operations
 *
 * @param doc - The document that was changed
 * @param operation - The operation type (create or update)
 * @param req - The request object
 */
export const envvarsAfterChangeHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  // Skip processing if this is a sync operation (prevents infinite loops)
  // Skip if _skipHooks is true OR if this is a system-initiated operation
  if (doc._skipHooks === true) {
    logger.envVars(`⏭️ Skipping hook processing - sync operation detected (_skipHooks=true)`)
    return
  }

  // Additional check: Skip if this is a system operation (no user context or specific system flags)
  if (req.user === undefined || (req as PayloadRequestWithUser).isSystemOperation === true) {
    logger.envVars(`⏭️ Skipping hook processing - system operation detected`)
    return
  }

  // CRITICAL: Additional protection against infinite loops
  // Check if we're in a rapid succession of updates (within 1 second)
  const rapidUpdateKey = `rapid-update-${doc.id}`
  const lastUpdateTime = global.rapidUpdateCache?.[rapidUpdateKey]
  const now = Date.now()

  if (lastUpdateTime && now - lastUpdateTime < 1000) {
    logger.envVars(
      `⏭️ Skipping hook processing - rapid update detected (${now - lastUpdateTime}ms ago)`,
    )
    return
  }

  // Set the rapid update marker
  if (!global.rapidUpdateCache) {
    global.rapidUpdateCache = {}
  }
  global.rapidUpdateCache[rapidUpdateKey] = now

  // Prevent multiple executions and add document lock
  if (isProcessing) {
    logger.envVars(`Hook already processing, skipping...`)
    return
  }

  // Add document-level processing lock to prevent concurrent updates
  const docLockKey = `envvars_processing_${doc.id}`
  if (global.rapidUpdateCache?.[docLockKey]) {
    logger.envVars(`Document ${doc.id} already being processed, skipping...`)
    return
  }
  if (!global.rapidUpdateCache) {
    global.rapidUpdateCache = {}
  }
  global.rapidUpdateCache[docLockKey] = Date.now()

  // Helper function to clean up document and operation locks
  const cleanupDocLock = () => {
    if (global.rapidUpdateCache) {
      delete global.rapidUpdateCache[docLockKey]
      delete global.rapidUpdateCache[operationLockKey]
    }
    // Note: finalUpdateKey is cleaned up in the setTimeout callback
    logger.envVars(`🔓 Document and operation locks cleaned up for ${doc.id}`)
  }

  // Helper function to clean up rapid update marker after a delay
  const cleanupRapidUpdateMarker = () => {
    setTimeout(() => {
      if (global.rapidUpdateCache) {
        delete global.rapidUpdateCache[rapidUpdateKey]
      }
      logger.envVars(`🔓 Rapid update marker cleaned up for ${doc.id}`)
    }, 2000) // Clean up after 2 seconds
  }

  // Add operation-specific lock to prevent multiple executions of the same operation
  const operationLockKey = `envvars_${operation}_${doc.id}`
  if (global.rapidUpdateCache?.[operationLockKey]) {
    logger.envVars(`Operation ${operation} for document ${doc.id} already in progress, skipping...`)
    cleanupDocLock()
    return
  }

  // Check if a final database update is still pending for this document
  const finalUpdateKey = `final-update-${doc.id}`
  if (global.rapidUpdateCache?.[finalUpdateKey]) {
    logger.envVars(
      `Final database update still pending for document ${doc.id}, skipping to prevent race condition...`,
    )
    cleanupDocLock()
    return
  }
  if (!global.rapidUpdateCache) {
    global.rapidUpdateCache = {}
  }
  global.rapidUpdateCache[operationLockKey] = Date.now()

  // Only process create/update operations
  if (operation !== 'create' && operation !== 'update') {
    logger.envVars(`⏭️ Skipping ${operation} operation - not a create/update`)
    cleanupDocLock()
    return
  }

  // CRITICAL: EARLY PROTECTION - If this is an UPDATE operation, check if we're in CREATE context
  // This prevents UPDATE operations from running when we're creating new variables
  let previousDoc: any = null
  if (operation === 'update') {
    // ENHANCED PROTECTION: Check if variables are being added during UPDATE operation (PRIORITY 1)
    try {
      // Get the previous document state to compare variable counts
      previousDoc = await req.payload.findByID({
        id: doc.id,
        collection: 'tenant-envariable',
      })

      if (previousDoc && previousDoc.envVars) {
        const previousCount = previousDoc.envVars.length
        const currentCount = doc.envVars?.length || 0

        if (currentCount > previousCount) {
          const addedCount = currentCount - previousCount
          logger.envVars(
            `✅ UPDATE operation with ${addedCount} new variables added (${previousCount} → ${currentCount})`,
            { addedCount, currentCount, documentId: doc.id, previousCount },
          )
        }
      }
    } catch (_fetchError) {
      // Silently continue if we can't fetch previous document
    }

    // SECONDARY PROTECTION: For UPDATE operations, variables without vercelId are VALID and should be processed
    // This allows UPDATE operations to create new variables or update existing ones without vercelId
    const hasVariablesToCreate =
      doc.envVars &&
      doc.envVars.some(
        (envVar: any) =>
          (!envVar.vercelId ||
            envVar.vercelId === 'null' ||
            envVar.vercelId === 'undefined' ||
            envVar.vercelId === '') &&
          envVar.vercelId !== 'FAILED_CREATION', // Exclude failed creations
      )

    if (hasVariablesToCreate) {
      logger.envVars(`✅ UPDATE operation with variables needing Vercel creation`)
    }
  }

  // Extract tenant ID
  const tenantId = typeof doc.tenant === 'string' ? doc.tenant : doc.tenant?.id
  if (!tenantId) {
    logger.envVars(`❌ No tenant ID found, skipping...`)
    cleanupDocLock()
    return
  }

  try {
    isProcessing = true
    logger.envVars(`🔄 Starting ${operation} operation for document ${doc.id}`)

    // Get tenant details
    const { payload } = req
    const tenant = await payload.findByID({
      id: tenantId,
      collection: 'tenant',
    })

    if (!tenant) {
      logger.envVars(`❌ Tenant ${tenantId} not found`)
      return
    }

    // Check tenant requirements
    if (tenant.status !== 'approved' || tenant.isActive !== true) {
      logger.envVars(`❌ Tenant ${tenant.name} not approved or inactive`)
      return
    }

    if (!tenant.vercelProjectId || !tenant.vercelProjectUrl) {
      logger.envVars(`❌ Tenant ${tenant.name} missing Vercel project information`)

      // Provide guidance on how to fix this
      logger.envVars(`💡 To fix this issue: Use /vercel/create-tenant or /vercel/sync endpoints`)

      cleanupDocLock()
      return
    }

    // Check for environment variables
    if (!doc.envVars || doc.envVars.length === 0) {
      logger.envVars(`❌ No environment variables found`)
      cleanupDocLock()
      return
    }

    logger.envVars(`✅ Processing ${doc.envVars.length} variables for tenant ${tenant.name}`)

    // Separate variables by vercelId status
    const varsToCreate: any[] = []
    const varsToUpdate: any[] = []

    doc.envVars.forEach((envVar: any) => {
      const hasValidVercelId =
        envVar.vercelId &&
        typeof envVar.vercelId === 'string' &&
        envVar.vercelId.trim() !== '' &&
        envVar.vercelId !== 'null' &&
        envVar.vercelId !== 'undefined' &&
        envVar.vercelId !== 'FAILED_CREATION' // Exclude failed creations

      if (hasValidVercelId) {
        // Variable has vercelId - check if it's a rename or value change
        const previousVarByKey = previousDoc?.envVars?.find((prev: any) => prev.key === envVar.key)
        const previousVarByVercelId = previousDoc?.envVars?.find(
          (prev: any) => prev.vercelId === envVar.vercelId,
        )

        // Check if this is a rename (same vercelId, different key)
        const isRename = previousVarByVercelId && previousVarByVercelId.key !== envVar.key
        const hasValueChanged = previousVarByKey && previousVarByKey.value !== envVar.value

        if (isRename) {
          // This is a rename - treat as create (delete old will be handled by delete detection)
          logger.envVars(
            `🔄 Variable ${envVar.key} detected as rename from ${previousVarByVercelId.key}`,
          )
          // For renames, we need to create the new variable and delete the old one
          // Remove vercelId so it gets treated as a new variable
          const renamedVar = { ...envVar, vercelId: null }
          varsToCreate.push(renamedVar)
        } else if (hasValueChanged) {
          // This is a value change - update on Vercel
          logger.envVars(`📝 Variable ${envVar.key} value changed - will update on Vercel`)
          varsToUpdate.push(envVar)
        }
      } else if (envVar.vercelId !== 'FAILED_CREATION') {
        // Variable has no vercelId - create on Vercel
        varsToCreate.push(envVar)
      }
    })

    // For UPDATE operations, we need to handle both new variables (no vercelId) and existing variables (has vercelId)
    // So we don't skip if varsToUpdate.length === 0, because varsToCreate might have new variables

    // CRITICAL: STRONG PROTECTION - Block UPDATE operations during CREATE process
    // This prevents UPDATE from interfering with CREATE operations
    // REMOVED: This was incorrectly blocking legitimate UPDATE operations with new variables

    // REMOVED: This was incorrectly blocking UPDATE operations with no valid Vercel IDs
    // UPDATE operations should be able to process variables that need Vercel creation

    // STEP 1: CREATE new variables (only if needed)
    // For UPDATE operations, skip this section - it will be handled in the UPDATE section
    if (varsToCreate.length > 0 && operation === 'create') {
      try {
        const { createEnvironmentVariables } = await import(
          '../endpoints/createEnvironmentVariables'
        )

        const mockReq = {
          json: () =>
            Promise.resolve({
              existingDocId: String(doc.id),
              existingEnvVars: varsToCreate, // Send ONLY new variables
              tenantId,
            }),
          payload,
        } as any

        const result = await createEnvironmentVariables(mockReq)
        const resultData = await result.json()

        if (result.status === 200 && resultData.success) {
          logger.envVars(`✅ CREATE endpoint succeeded`)

          // Update database with Vercel IDs AND processed values
          if (resultData.results?.[0]?.vercelIds && resultData.results[0]?.processedEnvVars) {
            const vercelIds = resultData.results[0].vercelIds
            const processedEnvVars = resultData.results[0].processedEnvVars
            logger.envVars(
              `🎯 Received ${vercelIds.length} Vercel IDs and ${processedEnvVars.length} processed variables`,
            )

            try {
              // Smart Vercel sync: use CREATE response data (Vercel IDs + processed values)
              try {
                // Merge Vercel IDs and processed values from CREATE response
                const updatedEnvVars = doc.envVars.map((envVar: any) => {
                  const vercelIdEntry = vercelIds.find((v: any) => v.key === envVar.key)
                  const processedEntry = processedEnvVars.find((v: any) => v.key === envVar.key)

                  if (vercelIdEntry && processedEntry) {
                    return {
                      ...envVar,
                      type: processedEntry.type || envVar.type, // Use processed type or fallback to original
                      value: processedEntry.value || envVar.value, // Use processed value or fallback to original
                      vercelId: vercelIdEntry.vercelId,
                    }
                  } else {
                    return envVar
                  }
                })

                // Count how many variables we successfully processed
                const processedCount = updatedEnvVars.filter((v: any) => v.vercelId).length
                logger.envVars(
                  `📊 Successfully processed ${processedCount}/${doc.envVars.length} variables with Vercel IDs`,
                )

                // If no vercelIds, we can't update the database but should still proceed
                if (vercelIds.length === 0) {
                  logger.envVars(`⚠️ Skipping database update - no vercelIds available`)
                  return // Exit early but don't fail the operation
                }

                // For CREATE operations, use delayed update. For UPDATE operations, skip this update
                // because UPDATE operations will handle their own database updates in the UPDATE section
                if (operation === 'create') {
                  // Delayed update for CREATE operations (document might not be committed yet)
                  const updateKey = `vercel-update-${doc.id}`

                  if (!(global as any)[updateKey]) {
                    ;(global as any)[updateKey] = true

                    logger.envVars(`🔄 Scheduling delayed update for document ${doc.id}`)

                    setTimeout(async () => {
                      try {
                        logger.envVars(`🔄 Updating document ${doc.id} with Vercel IDs`)

                        await payload.update({
                          id: doc.id,
                          collection: 'tenant-envariable',
                          data: {
                            envVars: updatedEnvVars,
                            lastUpdated: new Date().toISOString(),
                          },
                        })

                        logger.envVars(`✅ Vercel IDs saved successfully`)
                      } catch (delayedError) {
                        logger.error(
                          `❌ Delayed update failed for document ${doc.id}: ${delayedError instanceof Error ? delayedError.message : String(delayedError)}`,
                        )
                      } finally {
                        delete (global as any)[updateKey]
                      }
                    }, 500)
                  } else {
                    logger.envVars(`⚠️ Update already scheduled, skipping`)
                  }
                } else {
                  // For UPDATE operations, skip this update - it will be handled in the UPDATE section
                  logger.envVars(
                    `⏭️ Skipping database update in CREATE section for UPDATE operation`,
                  )
                }
              } catch (processingError) {
                logger.error(
                  `❌ Vercel ID processing failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`,
                )
                logger.envVars(
                  `⚠️ Vercel variables created but ID processing failed - check logs for details`,
                )
              }
            } catch (updateError) {
              logger.error(
                `⚠️ Outer database update failed: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
              )
              logger.envVars(
                `⚠️ Vercel variables created but database update failed - check logs for details`,
              )
            }
          }
        } else {
          logger.error(`❌ CREATE endpoint failed: ${resultData.message}`)
        }
      } catch (error) {
        logger.error(
          `❌ Error creating variables: ${error instanceof Error ? error.message : String(error)}`,
        )
      }

      // Note: Immediate fetch removed - will happen after delayed update succeeds
    }

    // STEP 1: Handle UPDATE operations (both create new variables and update existing ones)
    // For UPDATE operations, always process if there are variables to handle
    if (operation === 'update') {
      // For UPDATE operations, we can have both new variables (no vercelId) and existing variables (has vercelId)

      // First, validate that existing variables have valid Vercel IDs
      if (varsToUpdate.length > 0) {
        const allVarsHaveValidIds = varsToUpdate.every(
          (envVar) =>
            envVar.vercelId &&
            typeof envVar.vercelId === 'string' &&
            envVar.vercelId.trim() !== '' &&
            envVar.vercelId !== 'null' &&
            envVar.vercelId !== 'undefined',
        )

        if (!allVarsHaveValidIds) {
          logger.envVars(`⚠️ Skipping updates - some variables lack valid Vercel IDs`)
          cleanupDocLock()
          return
        }
      }

      // CRITICAL: Prevent UPDATE operations immediately after CREATE to stop infinite loops
      // REMOVED: This was incorrectly blocking UPDATE operations with new variables
      // UPDATE operations should be able to process new variables that need Vercel creation

      // REMOVED: Timing-based blocking for UPDATE operations
      // UPDATE operations should always be allowed to proceed as they handle legitimate updates

      // STRATEGY: Always sync with Vercel during UPDATE operations
      // Variables without vercelId: Create on Vercel and get vercelId
      // Variables with vercelId: Update on Vercel to ensure synchronization

      // For UPDATE operations:
      // - varsToCreate: New variables that need to be created on Vercel
      // - varsToUpdate: Existing variables that need to be updated on Vercel
      const varsNeedingVercelCreation = varsToCreate // New variables from UPDATE operation
      const varsNeedingVercelUpdate = varsToUpdate // Existing variables that need updates

      logger.envVars(
        `📊 Processing: ${varsNeedingVercelCreation.length} to create, ${varsNeedingVercelUpdate.length} to update`,
      )

      // STEP 1: Create variables without vercelId and update database immediately
      if (varsNeedingVercelCreation.length > 0) {
        logger.envVars(
          `🚀 Creating ${varsNeedingVercelCreation.length} variables without vercelId on Vercel`,
        )

        try {
          // Direct Vercel API call to avoid SimpleUpdateStrategy conflicts
          const { createEnvironmentVariablesDirect } = await import(
            '../endpoints/createEnvironmentVariables'
          )

          const result = await createEnvironmentVariablesDirect({
            existingDocId: String(doc.id),
            existingEnvVars: varsNeedingVercelCreation,
            payload: payload as any,
            tenantId,
          })

          if (result.success && result.vercelIds && result.processedEnvVars) {
            const vercelIds = result.vercelIds
            const processedEnvVars = result.processedEnvVars

            if (vercelIds.length === 0) {
              logger.error(
                `❌ No variables were created on Vercel - this will cause infinite loop`,
                {
                  documentId: doc.id,
                  tenantId,
                  variablesAttempted: varsNeedingVercelCreation.length,
                },
              )

              // Mark variables as failed to prevent infinite loop
              const updatedEnvVars = doc.envVars.map((envVar: any) => {
                const needsCreation = varsNeedingVercelCreation.some(
                  (v: any) => v.key === envVar.key,
                )
                if (needsCreation) {
                  return {
                    ...envVar,
                    vercelId: 'FAILED_CREATION', // Mark as failed to prevent retry
                  }
                }
                return envVar
              })
              doc.envVars = updatedEnvVars
              return // Exit early to prevent infinite loop
            }

            logger.envVars(`✅ Direct Vercel API call succeeded for missing variables`)
            logger.envVars(`🎯 Received ${vercelIds.length} Vercel IDs for missing variables`)

            // Merge Vercel IDs and processed values
            const updatedEnvVars = doc.envVars.map((envVar: any) => {
              const vercelIdEntry = vercelIds.find((v: any) => v.key === envVar.key)
              const processedEntry = processedEnvVars.find((v: any) => v.key === envVar.key)

              if (vercelIdEntry) {
                // We have a Vercel ID, update the variable
                return {
                  ...envVar,
                  type: processedEntry?.type || envVar.type,
                  value: processedEntry?.value || envVar.value,
                  vercelId: vercelIdEntry.vercelId,
                }
              }
              return envVar
            })

            // Store the updated variables for later database update
            logger.envVars(`📝 Storing updated variables for later database update`)

            // Update the doc object for subsequent operations
            doc.envVars = updatedEnvVars

            // Log successful merge
            const variablesWithVercelIds = doc.envVars.filter(
              (envVar: any) =>
                envVar.vercelId &&
                envVar.vercelId !== 'FAILED_CREATION' &&
                envVar.vercelId !== 'null' &&
                envVar.vercelId !== 'undefined' &&
                envVar.vercelId !== '',
            )
            logger.envVars(
              `✅ Successfully merged ${variablesWithVercelIds.length} variables with Vercel IDs`,
            )
          } else {
            logger.error(`❌ Direct Vercel API call failed for missing variables`, {
              documentId: doc.id,
              error: result.error || 'Unknown error',
              tenantId,
            })

            // Mark variables as failed to prevent infinite loop
            const updatedEnvVars = doc.envVars.map((envVar: any) => {
              const needsCreation = varsNeedingVercelCreation.some((v: any) => v.key === envVar.key)
              if (needsCreation) {
                return {
                  ...envVar,
                  vercelId: 'FAILED_CREATION', // Mark as failed to prevent retry
                }
              }
              return envVar
            })
            doc.envVars = updatedEnvVars
            return // Exit early if CREATE fails
          }
        } catch (error) {
          logger.error(
            `❌ Error creating missing variables`,
            { documentId: doc.id, tenantId },
            error instanceof Error ? error : undefined,
          )

          // Mark variables as failed to prevent infinite loop
          const updatedEnvVars = doc.envVars.map((envVar: any) => {
            const needsCreation = varsNeedingVercelCreation.some((v: any) => v.key === envVar.key)
            if (needsCreation) {
              return {
                ...envVar,
                vercelId: 'FAILED_CREATION', // Mark as failed to prevent retry
              }
            }
            return envVar
          })
          doc.envVars = updatedEnvVars
          return // Exit early if CREATE error
        }
      }

      // STEP 2: Update variables with vercelId
      if (varsNeedingVercelUpdate.length > 0) {
        logger.envVars(
          `📝 Processing ${varsNeedingVercelUpdate.length} existing variables for updates`,
        )

        let successfulUpdates = 0
        let failedUpdates = 0

        // Process updates in parallel for better performance
        const updatePromises = varsNeedingVercelUpdate.map(async (envVar) => {
          try {
            const { updateEnvironmentVariable } = await import(
              '../endpoints/updateEnvironmentVariable'
            )

            const mockReq = {
              json: () =>
                Promise.resolve({
                  envVarKey: envVar.key,
                  tenantId,
                  updates: {
                    type: envVar.type,
                    comment: envVar.comment,
                    gitBranch: envVar.gitBranch,
                    target: envVar.targets?.map((t: any) => t.target) || [
                      'production',
                      'preview',
                      'development',
                    ],
                    value: envVar.value,
                  },
                }),
              payload,
            } as any

            const result = await updateEnvironmentVariable(mockReq)
            const resultData = await result.json()

            if (result.status === 200 && resultData.success) {
              logger.envVars(`✅ Updated ${envVar.key} on Vercel`)
              return { key: envVar.key, success: true }
            } else {
              logger.error(`Failed to update ${envVar.key}: ${resultData.message}`)
              return { error: resultData.message, key: envVar.key, success: false }
            }
          } catch (error) {
            logger.error(
              `Error updating ${envVar.key}: ${error instanceof Error ? error.message : String(error)}`,
            )
            return {
              error: error instanceof Error ? error.message : String(error),
              key: envVar.key,
              success: false,
            }
          }
        })

        // Wait for all updates to complete
        const updateResults = await Promise.all(updatePromises)

        // Count results
        successfulUpdates = updateResults.filter((r) => r.success).length
        failedUpdates = updateResults.filter((r) => !r.success).length

        logger.envVars(
          `📊 Update summary: ${successfulUpdates} successful, ${failedUpdates} failed`,
        )

        // If any updates failed, abort the process to prevent inconsistent state
        if (failedUpdates > 0) {
          logger.error(
            `❌ Aborting update process due to ${failedUpdates} failed Vercel operations`,
          )

          // Mark failed variables to prevent retry
          const updatedEnvVars = doc.envVars.map((envVar: any) => {
            const failedUpdate = updateResults.find((r) => !r.success && r.key === envVar.key)
            if (failedUpdate) {
              return {
                ...envVar,
                vercelId: 'FAILED_UPDATE', // Mark as failed to prevent retry
              }
            }
            return envVar
          })
          doc.envVars = updatedEnvVars
          return // Exit early to prevent further processing
        }
      }

      // STEP 2: DELETE removed variables (only for UPDATE operations)
      // Only delete variables that are truly removed from the array
      let deletedVarsCount = 0
      if (
        operation === 'update' &&
        previousDoc &&
        previousDoc.envVars &&
        previousDoc.envVars.length > 0
      ) {
        const currentKeys = doc.envVars.map((v: any) => v.key)
        const deletedVars = previousDoc.envVars.filter((prevVar: any) => {
          const stillExists = currentKeys.includes(prevVar.key)
          const hasValidVercelId =
            prevVar.vercelId &&
            typeof prevVar.vercelId === 'string' &&
            prevVar.vercelId.trim() !== '' &&
            prevVar.vercelId !== 'null' &&
            prevVar.vercelId !== 'undefined' &&
            prevVar.vercelId !== 'FAILED_CREATION'
          return !stillExists && hasValidVercelId
        })

        if (deletedVars.length > 0) {
          logger.envVars(`🗑️ Detected ${deletedVars.length} variables to delete from Vercel`)

          try {
            const { deleteEnvironmentVariablesDirect } = await import(
              '../endpoints/deleteEnvironmentVariable'
            )

            const envVarIds = deletedVars.map((v: any) => v.vercelId)
            const deleteResult = await deleteEnvironmentVariablesDirect({
              envVarIds,
              projectId: tenant.vercelProjectId,
              teamId: tenant.vercelTeamId,
            })

            if (deleteResult.success) {
              logger.envVars(
                `✅ Successfully deleted ${deleteResult.successfulDeletes}/${deletedVars.length} variables from Vercel`,
              )
              deletedVarsCount = deleteResult.successfulDeletes || 0
            } else {
              logger.error(`❌ Failed to delete variables from Vercel: ${deleteResult.error}`)
            }
          } catch (deleteError) {
            logger.error(
              `❌ Error deleting variables from Vercel: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
            )
          }
        }
      }

      logger.envVars(
        `📊 UPDATE operation completed: ${varsToCreate.length} new variables created, ${varsNeedingVercelCreation.length} missing variables processed, ${varsNeedingVercelUpdate.length} existing variables updated, ${deletedVarsCount} variables deleted`,
      )

      // FINAL STEP: Update database with all Vercel IDs after all Vercel operations are complete
      // Check if we have any variables that need Vercel IDs updated in the database
      const hasVariablesNeedingVercelIds = doc.envVars.some(
        (envVar: any) =>
          envVar.vercelId &&
          envVar.vercelId !== 'FAILED_CREATION' &&
          envVar.vercelId !== 'null' &&
          envVar.vercelId !== 'undefined' &&
          envVar.vercelId !== '',
      )

      if (hasVariablesNeedingVercelIds) {
        // Use delayed update to avoid write conflicts
        const finalUpdateKey = `final-update-${doc.id}`

        // Check if a final update is already scheduled or recently completed
        const lastFinalUpdate = (global as any)[`${finalUpdateKey}-timestamp`]
        const now = Date.now()

        if (lastFinalUpdate && now - lastFinalUpdate < 1000) {
          logger.envVars(
            `⏭️ Skipping final database update - too recent (${now - lastFinalUpdate}ms ago)`,
          )
        } else if (!(global as any)[finalUpdateKey]) {
          ;(global as any)[finalUpdateKey] = true
          ;(global as any)[`${finalUpdateKey}-timestamp`] = now

          logger.envVars(`🔄 Scheduling delayed database update to avoid write conflicts`)

          setTimeout(async () => {
            try {
              const { SimpleUpdateStrategy } = await import(
                '../endpoints/createEnvironmentVariables'
              )
              const strategy = new SimpleUpdateStrategy(payload as any)

              // Extract Vercel IDs for the strategy
              const vercelIdsForStrategy = doc.envVars
                .filter(
                  (envVar: any) =>
                    envVar.vercelId &&
                    envVar.vercelId !== 'FAILED_CREATION' &&
                    envVar.vercelId !== 'null' &&
                    envVar.vercelId !== 'undefined' &&
                    envVar.vercelId !== '',
                )
                .map((envVar: any) => ({
                  key: envVar.key,
                  vercelId: envVar.vercelId,
                }))

              // Pass the updated environment variables to preserve values
              const updateSuccess = await strategy.updateEnvVarDocument(
                String(doc.id),
                vercelIdsForStrategy,
                {
                  environment: 'production',
                  tenantId: String(tenantId),
                  updatedEnvVars: doc.envVars, // Pass the updated variables with values
                },
              )

              if (updateSuccess) {
                logger.envVars(`✅ Delayed database update completed successfully`)
              } else {
                logger.error(`❌ Delayed SimpleUpdateStrategy failed`)
              }
            } catch (delayedError) {
              logger.error(
                `❌ Delayed database update failed: ${delayedError instanceof Error ? delayedError.message : String(delayedError)}`,
              )
            } finally {
              delete (global as any)[finalUpdateKey]
              delete (global as any)[`${finalUpdateKey}-timestamp`]
            }
          }, 1000) // 1 second delay to ensure hook completes
        }
      }

      // AUTO-DEPLOY LOGIC: Check if autodeploy is enabled and trigger deployment
      if (doc.autodeploy) {
        const autoDeployTenantId = typeof doc.tenant === 'string' ? doc.tenant : doc.tenant?.id
        try {
          logger.envVars('Autodeploy enabled, checking tenant status...')

          // Get the tenant to check if it has approved status and isActive
          const tenant = await payload.findByID({
            id: tenantId,
            collection: 'tenant',
          })

          if (!tenant || tenant.status !== 'approved' || tenant.isActive !== true) {
            logger.envVars('Tenant not approved or inactive, skipping auto-deploy')
          } else if (!tenant.vercelProjectId) {
            logger.envVars('Tenant missing Vercel project ID, skipping auto-deploy')
          } else if (
            !tenant.vercelProjectGitRepository?.owner ||
            !tenant.vercelProjectGitRepository?.repo ||
            !tenant.vercelProjectGitRepository?.repoId
          ) {
            logger.envVars('Tenant missing git repository information, skipping auto-deploy')
          } else {
            logger.envVars('Tenant ready for auto-deploy, creating deployment record...')

            // Create deployment record first (without Vercel deployment info)
            // Use a small delay to ensure environment variables are fully saved
            setTimeout(async () => {
              try {
                const deploymentRecord = await payload.create({
                  collection: 'tenant-deployment',
                  data: {
                    environment: doc.environment || 'production',
                    meta: {
                      operation,
                      source: 'envvars-autodeploy',
                      timestamp: new Date().toISOString(),
                    },
                    status: 'queued',
                    tenant: tenantId,
                    triggerType: 'auto',
                  },
                })

                logger.envVars('Deployment record created successfully')
                logger.envVars(
                  'Deployment will be triggered automatically by deploymentTriggerHook',
                )

                // Note: The deploymentTriggerHook will handle the actual Vercel deployment
                // We don't need to trigger it manually here to avoid conflicts
              } catch (createError) {
                logger.error(
                  `Error creating deployment record: ${createError instanceof Error ? createError.message : String(createError)}`,
                )
                // Don't throw error here as the main operation already succeeded
                // Just log the failure for monitoring
              }
            }, 2000) // 2 second delay to ensure environment variables are fully saved
          }
        } catch (error) {
          logger.error(
            `Error in auto-deploy logic: ${error instanceof Error ? error.message : String(error)}`,
          )
          // Don't throw error here as the main operation already succeeded
          // Just log the failure for monitoring
        }
      }

      logger.envVars(`✅ Operation ${operation} completed successfully`)
    }
  } catch (error) {
    logger.error(
      `❌ Error in environment variable management: ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    isProcessing = false
    // Clean up document lock
    cleanupDocLock()
    // Clean up rapid update marker
    cleanupRapidUpdateMarker()
    logger.envVars(`🔄 Hook processing completed`)
  }
}

/**
 * Before-validate hook for tenant environment variables collection
 * Simple duplicate prevention
 * @param data - The data being validated
 * @param operation - The operation type (create or update)
 * @param req - The request object
 */
export const envvarsBeforeValidateHook: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  // Skip processing if this is a sync operation
  // Skip if _skipHooks is true OR if this is a system-initiated operation
  if (data?._skipHooks === true) {
    logger.envVars(`⏭️ Skipping validation hook - sync operation detected (_skipHooks=true)`)
    return
  }

  // Additional check: Skip if this is a system operation (no user context or specific system flags)
  if (req.user === undefined || (req as any).isSystemOperation === true) {
    logger.envVars(`⏭️ Skipping validation hook - system operation detected`)
    return
  }

  if (!data?.envVars || (operation !== 'create' && operation !== 'update')) {
    return
  }

  try {
    const { payload } = req
    const tenantId = typeof data.tenant === 'string' ? data.tenant : data.tenant?.id
    const environment = data.environment

    if (!tenantId || !environment) {
      return
    }

    // Update envVarCount and lastUpdated to match the actual data
    data.envVarCount = data.envVars.length
    data.lastUpdated = new Date().toISOString()

    // Check for duplicate keys within current data
    const keys = data.envVars.map((v: any) => v.key).filter(Boolean)
    const uniqueKeys = new Set(keys)

    if (keys.length !== uniqueKeys.size) {
      logger.warn(`⚠️ Duplicate environment variable keys detected`)
    }

    // ENFORCE ONE-TO-ONE RELATIONSHIP: Check if another tenant environment variable already exists for this tenant
    if (operation === 'create') {
      try {
        const existingDoc = await payload.find({
          collection: 'tenant-envariable',
          limit: 1,
          where: {
            tenant: { equals: tenantId },
          },
        })

        if (existingDoc.docs.length > 0) {
          const { APIError } = await import('payload')
          const errorMessage = `A tenant environment variable record already exists for tenant ${tenantId}. Only one record per tenant is allowed.`
          logger.error(`${errorMessage}`)
          throw new APIError(errorMessage, 400)
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          throw error
        }
        // If it's not our specific error, continue with validation
        logger.warn(
          `Could not verify tenant uniqueness: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }
  } catch (error) {
    const errorTenantId = typeof data?.tenant === 'string' ? data.tenant : data?.tenant?.id
    logger.error(
      `Error during validation: ${error instanceof Error ? error.message : String(error)}`,
    )
    throw error // Re-throw to prevent the operation
  }
}
