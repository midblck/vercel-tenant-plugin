/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadHandler } from 'payload'

import { createTenantAwareLogger } from '../utils/loggerInit'
import { withErrorHandling } from '../utils/errors'
import type { CreateTenantRequest, EnhancedVercelProject } from '../types'

import { createVercelProject, getProjectDomains } from './vercelClient'
import { getVercelCredentials } from './vercelUtils'

// ============================================================================
// CREATE NEW TENANT ENDPOINT
// ============================================================================

export const createNewTenant: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
    // Get payload instance from request
    const payload = req.payload

    // Create tenant-aware logger
    const logger = createTenantAwareLogger(payload)

    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { teamId, vercelToken } = await getVercelCredentials(payload)
    // const currentTimestamp = Date.now() // Unused variable

    // Parse the request body
    let body: CreateTenantRequest | undefined
    try {
      if (req.body) {
        body = await req.json?.()
      }
    } catch (error) {
      void logger.warn('Could not parse request body', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Get request body data
    const { name, description, isActive = true, tenantId } = body || {}

    if (!name) {
      return Response.json(
        {
          error: 'Tenant name is required',
          success: false,
        },
        { status: 400 },
      )
    }

    let tenant

    // Check if tenant already exists (called from hook)
    if (tenantId) {
      tenant = await payload.findByID({
        id: tenantId,
        collection: 'tenant',
      })
    } else {
      // Check if a tenant with this name already exists
      const existingTenant = await payload.find({
        collection: 'tenant',
        where: {
          name: {
            equals: name,
          },
        },
      })

      if (existingTenant.docs.length > 0) {
        return Response.json(
          {
            error: `Tenant with name "${name}" already exists`,
            success: false,
          },
          { status: 409 },
        )
      }

      // CRITICAL CHANGE: Don't create tenant record yet - wait for Vercel project creation
      // We'll create it only after successful Vercel project creation
    }

    // Check if tenant status allows Vercel project creation
    if (tenant && tenant.status !== 'approved') {
      return Response.json({
        message: `Tenant "${name}" created successfully with status "${tenant.status}". Vercel project will be created when status is changed to "approved".`,
        success: true,
        tenant,
        vercelProject: null,
      })
    }

    // STEP 1: Create Vercel project FIRST (before tenant collection)
    void logger.info(`Creating Vercel project for "${name}"...`)

    const vercelResult = await createVercelProject(
      { teamId, vercelToken },
      {
        name,
        buildCommand: 'pnpm build:prod',
        gitRepository: tenant?.vercelProjectGitRepository
          ? {
              type: tenant.vercelProjectGitRepository.type,
              repo: `${tenant.vercelProjectGitRepository.owner}/${tenant.vercelProjectGitRepository.repo}`,
            }
          : undefined,
        installCommand: 'pnpm install',
      },
    )

    // Check Vercel project creation result
    if (!vercelResult.success || !vercelResult.data) {
      void logger.error(`Vercel project creation failed for "${name}"`, {
        error: vercelResult.error,
        tenantName: name,
      })

      // If Vercel project creation fails, return error WITHOUT creating tenant
      // This prevents orphaned tenant records with failed Vercel projects
      return Response.json(
        {
          error: vercelResult.error || 'Failed to create Vercel project',
          success: false,
          // Don't include tenant since we didn't create one
        },
        { status: 400 }, // Use 400 to match Vercel's error status
      )
    }

    const vercelProject = vercelResult.data as EnhancedVercelProject
    void logger.info(`Vercel project created successfully: ${vercelProject.id}`)

    // IMMEDIATE SYNC: Call syncSingleProject right after tenant creation to get complete data
    void logger.info(
      `🚀 Creating tenant with basic Vercel data, will sync complete data immediately after creation`,
    )

    // STEP 2: Fetch domains for the newly created project
    const domainsResult = await getProjectDomains({ teamId, vercelToken }, vercelProject.id)
    const projectDomains = domainsResult.success ? domainsResult.data : null

    void logger.info(`Fetched domains for new project ${vercelProject.name}`, {
      domainsCount: projectDomains?.domains?.length || 0,
      success: domainsResult.success,
    })

    // Ensure projectDomains is an array and extract the domains property
    const domainsArray = Array.isArray(projectDomains)
      ? projectDomains
      : projectDomains?.domains && Array.isArray(projectDomains.domains)
        ? projectDomains.domains
        : []

    // STEP 3: NOW create tenant record with Vercel project details (only after successful Vercel creation)
    if (!tenant) {
      const tenantData = {
        name,
        description: description || `Vercel project for ${name}`,
        isActive,
        lastSynced: new Date().toISOString(),
        status: 'approved', // Set to approved since Vercel project was created successfully

        // Populate with actual Vercel project data
        vercelProjectCreatedAt: vercelProject.createdAt
          ? new Date(vercelProject.createdAt).toISOString()
          : null,
        vercelProjectCrons: vercelProject.crons || null,
        vercelProjectDomains: domainsArray.map((domain: any) => ({
          domain: domain.name,
          verified: domain.verified || false,
        })),
        vercelProjectEnvironment: 'production',
        vercelProjectFramework: vercelProject.framework || null,
        vercelProjectGitRepository: vercelProject.link
          ? {
              type: vercelProject.link.type || 'github',
              branch: vercelProject.link.productionBranch || 'main',
              owner: vercelProject.link.org || '',
              repo: vercelProject.link.repo || '',
              repoId: vercelProject.link.repoId,
              repoOwnerId: vercelProject.link.repoOwnerId,
            }
          : null,
        vercelProjectId: vercelProject.id,
        vercelProjectName: vercelProject.name,
        vercelProjectStatus: 'ready',
        vercelProjectUpdatedAt: vercelProject.updatedAt
          ? new Date(vercelProject.updatedAt).toISOString()
          : null,
        vercelProjectUrl: (() => {
          // Priority: custom domain > project URL > default vercel.app URL
          let url = ''

          if (domainsArray.length > 0) {
            // Use the first verified domain, or first domain if none verified
            const verifiedDomain = domainsArray.find((domain: any) => domain.verified)
            url = verifiedDomain
              ? `https://${verifiedDomain.name}`
              : `https://${domainsArray[0].name}`
          } else if (vercelProject.url) {
            // Use the project URL if available
            url = vercelProject.url
          } else {
            // Fallback to default vercel.app URL
            url = `https://${vercelProject.name}.vercel.app`
          }

          // Log the URL being set
          void logger.debug(`Setting vercelProjectUrl for tenant "${name}": ${url}`, {
            domainsArray,
            projectName: vercelProject.name,
            projectUrl: vercelProject.url,
          })

          return url
        })(),
        vercelTeamId: teamId,
        // Transfer information
        transferCompletedAt: vercelProject.transferCompletedAt || null,
        transferredFromAccountId: vercelProject.transferredFromAccountId || null,
        transferStartedAt: vercelProject.transferStartedAt || null,
        transferToAccountId: vercelProject.transferToAccountId || null,
      }

      // Create the tenant record only after successful Vercel project creation
      tenant = await payload.create({
        collection: 'tenant',
        data: tenantData,
      })

      void logger.info(`Tenant record created successfully: ${tenant.id}`)
    } else {
      // Update existing tenant with Vercel project details
      const updatedTenantData = {
        lastSynced: new Date().toISOString(),
        vercelProjectCreatedAt: vercelProject.createdAt
          ? new Date(vercelProject.createdAt).toISOString()
          : null,
        vercelProjectCrons: vercelProject.crons || null,
        vercelProjectDomains: domainsArray.map((domain: any) => ({
          domain: domain.name,
          verified: domain.verified || false,
        })),
        vercelProjectEnvironment: 'production',
        vercelProjectFramework: vercelProject.framework || null,
        vercelProjectGitRepository: vercelProject.link
          ? {
              type: vercelProject.link.type || 'github',
              branch: vercelProject.link.productionBranch || 'main',
              owner: vercelProject.link.org || '',
              repo: vercelProject.link.repo || '',
              repoId: vercelProject.link.repoId,
              repoOwnerId: vercelProject.link.repoOwnerId,
            }
          : null,
        vercelProjectId: vercelProject.id,
        vercelProjectName: vercelProject.name,
        vercelProjectStatus: 'ready',
        vercelProjectUpdatedAt: vercelProject.updatedAt
          ? new Date(vercelProject.updatedAt).toISOString()
          : null,
        vercelProjectUrl: (() => {
          // Priority: custom domain > project URL > default vercel.app URL
          let url = ''

          if (domainsArray.length > 0) {
            // Use the first verified domain, or first domain if none verified
            const verifiedDomain = domainsArray.find((domain: any) => domain.verified)
            url = verifiedDomain
              ? `https://${verifiedDomain.name}`
              : `https://${domainsArray[0].name}`
          } else if (vercelProject.url) {
            // Use the project URL if available
            url = vercelProject.url
          } else {
            // Fallback to default vercel.app URL
            url = `https://${vercelProject.name}.vercel.app`
          }

          // Log the URL being set
          void logger.debug(`Setting vercelProjectUrl for tenant "${name}": ${url}`, {
            domainsArray,
            projectName: vercelProject.name,
            projectUrl: vercelProject.url,
          })

          return url
        })(),
        // Additional Vercel project fields for comprehensive tenant data
        analytics: vercelProject.analytics || null,
        autoAssignCustomDomains: vercelProject.autoAssignCustomDomains || null,
        autoExposeSystemEnvs: vercelProject.autoExposeSystemEnvs || null,
        buildCommand: vercelProject.buildCommand || null,
        connectBuildsEnabled: vercelProject.connectBuildsEnabled || null,
        connectConfigurationId: vercelProject.connectConfigurationId || null,
        customEnvironments: vercelProject.customEnvironments || null,
        defaultResourceConfig: vercelProject.defaultResourceConfig || null,
        deploymentExpiration: vercelProject.deploymentExpiration || null,
        devCommand: vercelProject.devCommand || null,
        directoryListing: vercelProject.directoryListing || false,
        features: vercelProject.features || null,
        gitComments: vercelProject.gitComments || null,
        gitForkProtection: vercelProject.gitForkProtection || false,
        gitLFS: vercelProject.gitLFS || false,
        gitProviderOptions: vercelProject.gitProviderOptions || null,
        installCommand: vercelProject.installCommand || null,
        live: vercelProject.live || false,
        nodeVersion: vercelProject.nodeVersion || null,
        outputDirectory: vercelProject.outputDirectory || null,
        passwordProtection: vercelProject.passwordProtection || null,
        paused: vercelProject.paused || false,
        publicSource: vercelProject.publicSource || false,
        resourceConfig: vercelProject.resourceConfig || null,
        rollingRelease: vercelProject.rollingRelease || null,
        rootDirectory: vercelProject.rootDirectory || null,
        speedInsights: vercelProject.speedInsights || null,
        ssoProtection: vercelProject.ssoProtection || null,
        tier: vercelProject.tier || 'standard',
        transferCompletedAt: vercelProject.transferCompletedAt || null,
        transferredFromAccountId: vercelProject.transferredFromAccountId || null,
        transferStartedAt: vercelProject.transferStartedAt || null,
        transferToAccountId: vercelProject.transferToAccountId || null,
        v0: vercelProject.v0 || false,
        webAnalytics: vercelProject.webAnalytics || null,
      }

      tenant = await payload.update({
        id: tenant.id,
        collection: 'tenant',
        data: updatedTenantData,
      })

      void logger.info(`Existing tenant updated with Vercel project details: ${tenant.id}`)
    }

    // 🚀 ENHANCED SYNC: Wait for complete Vercel data before returning
    void logger.info(`🔄 Fetching complete Vercel data for tenant "${name}"...`)

    try {
      const { syncSingleProject } = await import('./syncSingleProject')

      // Create a mock request object for syncSingleProject
      const mockReq = {
        json: () => Promise.resolve({ projectId: vercelProject.id }),
        payload,
        url: `http://localhost/api/sync-single-project?projectId=${vercelProject.id}`,
      } as any

      const syncResult = await syncSingleProject(mockReq)

      if (syncResult.status === 200) {
        const responseData = await syncResult.json()
        if (responseData.success) {
          // Verify critical data is present
          const updatedTenant = await payload.findByID({
            id: tenant.id,
            collection: 'tenant',
          })

          if (!updatedTenant?.vercelProjectGitRepository?.repoId) {
            throw new Error(
              `Critical data missing: repoId not found after sync for tenant "${name}"`,
            )
          }

          void logger.info(`✅ Complete Vercel data fetched successfully for tenant "${name}"`, {
            projectId: vercelProject.id,
            repoId: updatedTenant.vercelProjectGitRepository.repoId,
            tenantId: tenant.id,
          })

          // Update tenant reference to the fully synced version
          tenant = updatedTenant
        } else {
          throw new Error(`Sync failed: ${responseData.error}`)
        }
      } else {
        throw new Error(`Sync returned error status: ${syncResult.status}`)
      }
    } catch (syncError) {
      logger.error(`❌ Critical sync failed for tenant "${name}"`, {
        error: syncError instanceof Error ? syncError.message : String(syncError),
        projectId: vercelProject.id,
        tenantId: tenant.id,
      })

      // Clean up: Delete the tenant since sync failed
      try {
        await payload.delete({
          id: tenant.id,
          collection: 'tenant',
        })
        void logger.info(`🗑️ Cleaned up tenant "${name}" after sync failure`)
      } catch (cleanupError) {
        logger.error(`❌ Failed to clean up tenant "${name}" after sync failure`, {
          cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        })
      }

      // Return error response
      return Response.json(
        {
          error: syncError instanceof Error ? syncError.message : String(syncError),
          message: `Failed to create tenant "${name}": ${syncError instanceof Error ? syncError.message : String(syncError)}`,
          success: false,
        },
        { status: 500 },
      )
    }

    return Response.json({
      message: `Successfully created tenant "${name}" with Vercel project`,
      success: true,
      tenant,
      vercelProject: {
        id: vercelProject.id,
        name: vercelProject.name,
        framework: vercelProject.framework || null,
        status: 'ready',
        url: vercelProject.url || '',
      },
    })
  }, 'createNewTenant')
}
