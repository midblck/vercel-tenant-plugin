/* eslint-disable perfectionist/sort-objects */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadHandler } from 'payload'

import { getProjectDomains, getVercelProjects } from './vercelClient'
import { getVercelCredentialsForTenant } from './vercelUtils'
import { logger } from '../utils/logger'
import { createNewTenantData, updateExistingTenantData } from '../utils/vercelDataMapper'

// ============================================================================
// SYNC PROJECTS ENDPOINT
// ============================================================================

export const syncProjects: PayloadHandler = async (req) => {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { teamId, vercelToken, source, isValid } = await getVercelCredentialsForTenant(
      req.payload,
    )

    void logger.info(`Using credentials for project sync`, {
      source: source,
      isValid: isValid,
    })

    const result = await getVercelProjects({ teamId, vercelToken })

    if (!result.success || !result.data) {
      return Response.json(
        {
          error: result.error || 'Failed to fetch projects',
          success: false,
        },
        { status: 500 },
      )
    }

    const projects = (result.data as any)?.projects || result.data || []

    const syncResults = []
    let currentProgress = 0

    // Get payload instance from request
    const payload = req.payload

    // Update progress tracking function
    const updateProgress = (projectName: string, status: string) => {
      currentProgress++
      void logger.info(`🔄 [${currentProgress}/${projects.length}] ${status}: ${projectName}`)
    }

    for (const project of projects) {
      try {
        void updateProgress(project.name, 'Processing')

        // Check if tenant already exists
        const existingTenant = await payload.find({
          collection: 'tenant',
          where: {
            vercelProjectId: {
              equals: project.id,
            },
          },
        })

        if (existingTenant.docs.length > 0) {
          const existingTenantDoc = existingTenant.docs[0]
          const currentProjectStatus = project.latestDeployments?.[0]?.readyState || 'unknown'

          // Always update existing tenants with fresh data from Vercel
          try {
            // Fetch domains for this project
            const domainsResult = await getProjectDomains({ teamId, vercelToken }, project.id)
            const projectDomains = domainsResult.success ? domainsResult.data : null

            // Ensure projectDomains is an array and extract the domains property
            const domainsArray = Array.isArray(projectDomains)
              ? projectDomains
              : projectDomains?.domains && Array.isArray(projectDomains.domains)
                ? projectDomains.domains
                : []

            const updateData = updateExistingTenantData(project, domainsArray, currentProjectStatus)

            // Update the existing tenant with fresh data and sync origin flag
            await payload.update({
              id: existingTenantDoc.id,
              collection: 'tenant',
              data: {
                ...updateData,
                _syncOrigin: 'vercel-sync', // Flag to prevent infinite loops
              },
            })

            void updateProgress(project.name, 'Updated')
            const updateReason = 'Status set to approved and data refreshed from Vercel'

            syncResults.push({
              projectId: project.id,
              projectName: project.name,
              status: 'updated',
              reason: updateReason,
              tenantId: existingTenantDoc.id,
              message: `🔄 Successfully updated tenant "${project.name}" with latest Vercel data`,
              details: {
                hasCrons: !!project.crons,
                domainsCount: domainsArray.length,
                framework: project.framework || 'unknown',
                environment: project.environment || 'production',
                statusChanged: currentProjectStatus !== existingTenantDoc.vercelProjectStatus,
              },
              data: updateData,
            })
          } catch (updateError) {
            void logger.error(
              `Error updating existing tenant ${existingTenantDoc.id}:`,
              { tenantId: existingTenantDoc.id, projectId: project.id },
              updateError as Error,
            )
            syncResults.push({
              projectId: project.id,
              projectName: project.name,
              status: 'error',
              reason: 'Failed to update existing tenant',
              tenantId: existingTenantDoc.id,
              error: updateError instanceof Error ? updateError.message : 'Unknown error',
            })
          }

          continue
        }

        // Fetch domains for new tenant creation
        const domainsResult = await getProjectDomains({ teamId, vercelToken }, project.id)
        const projectDomains = domainsResult.success ? domainsResult.data : null

        // Ensure projectDomains is an array and extract the domains property
        const domainsArray = Array.isArray(projectDomains)
          ? projectDomains
          : projectDomains?.domains && Array.isArray(projectDomains.domains)
            ? projectDomains.domains
            : []

        // Create tenant data with comprehensive Vercel data mapping
        let tenantData
        try {
          tenantData = createNewTenantData(project, domainsArray, teamId)
        } catch (dataError) {
          void logger.error(
            `Error creating tenant data for project ${project.name}:`,
            { projectName: project.name, projectId: project.id },
            dataError as Error,
          )
          throw dataError
        }

        // Create new tenant
        const tenant = await payload.create({
          collection: 'tenant',
          data: tenantData,
        })

        void updateProgress(project.name, 'Created')
        syncResults.push({
          projectId: project.id,
          projectName: project.name,
          status: 'synced',
          tenantId: tenant.id,
          message: `✅ Successfully created tenant "${project.name}" from Vercel project`,
          details: {
            hasCrons: !!project.crons,
            domainsCount: domainsArray.length,
            framework: project.framework || 'unknown',
            environment: project.environment || 'production',
          },
          data: tenantData,
        })
      } catch (error) {
        void logger.error(
          `Error syncing project ${project.id}:`,
          { projectId: project.id, projectName: project.name },
          error as Error,
        )
        void updateProgress(project.name, 'Error')
        syncResults.push({
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId: project.id,
          projectName: project.name,
          status: 'error',
          message: `❌ Failed to sync project "${project.name}"`,
          details: {
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            hasCrons: !!project.crons,
            projectId: project.id,
          },
        })
      }
    }

    const syncedCount = syncResults.filter((r) => r.status === 'synced').length
    const updatedCount = syncResults.filter((r) => r.status === 'updated').length
    const errorCount = syncResults.filter((r) => r.status === 'error').length

    return Response.json({
      data: syncResults,
      message: `🎯 Sync completed: ${syncedCount} new tenants created, ${updatedCount} existing tenants updated${errorCount > 0 ? `, ${errorCount} errors encountered` : ''}`,
      success: true,
      total: projects.length,
      progress: {
        current: projects.length,
        total: projects.length,
        message: `✅ All ${projects.length} projects processed successfully`,
      },
      summary: {
        synced: syncedCount,
        updated: updatedCount,
        errors: errorCount,
        totalProcessed: projects.length,
        successRate:
          projects.length > 0
            ? Math.round(((syncedCount + updatedCount) / projects.length) * 100)
            : 0,
      },
      toastMessages: syncResults.map((result) => ({
        type:
          result.status === 'synced' ? 'success' : result.status === 'updated' ? 'info' : 'error',
        title: result.message,
        details: result.details,
        projectName: result.projectName,
      })),
    })
  } catch (error) {
    void logger.error(
      'Error in syncProjects endpoint:',
      { endpoint: 'syncProjects' },
      error as Error,
    )

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
        message: '❌ Sync process failed due to an unexpected error',
        details: {
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    )
  }
}
