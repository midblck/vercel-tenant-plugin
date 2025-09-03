import type { PayloadHandler } from 'payload'

import { logger } from '../utils/logger'
import { withErrorHandling } from '../utils/errors'
import { getVercelCredentials } from './vercelUtils'

export const createDeployment: PayloadHandler = async (req) => {
  return withErrorHandling(async () => {
    logger.deployment('Starting deployment creation...')
    const { deploymentData, tenantId } = (await req.json?.()) || {}
    const { payload } = req
    const { teamId, vercel } = await getVercelCredentials(payload, tenantId)

    logger.deployment('Request params', { teamId, tenantId })

    if (!tenantId) {
      return Response.json({ error: 'Missing tenantId parameter', success: false }, { status: 400 })
    }

    // Get tenant and project info
    const tenant = await payload.findByID({ id: tenantId, collection: 'tenant' })
    if (!tenant?.vercelProjectId) {
      return Response.json(
        { error: 'Tenant not found or missing project', success: false },
        { status: 404 },
      )
    }

    // Check if we have required git repository information
    if (
      !tenant.vercelProjectGitRepository?.owner ||
      !tenant.vercelProjectGitRepository?.repo ||
      !tenant.vercelProjectGitRepository?.repoId
    ) {
      return Response.json(
        { error: 'Tenant missing git repository information (owner/repo/repoId)', success: false },
        { status: 400 },
      )
    }

    logger.deployment('Creating deployment for tenant', { tenantName: tenant.name })
    logger.deployment('Git repository info', {
      type: tenant.vercelProjectGitRepository?.type,
      branch: tenant.vercelProjectGitRepository?.branch,
      owner: tenant.vercelProjectGitRepository?.owner,
      repo: tenant.vercelProjectGitRepository?.repo,
    })

    // Use the actual repoId from tenant collection if available
    const repoId = tenant.vercelProjectGitRepository?.repoId

    logger.deployment('Using repoId from tenant', { repoId })
    logger.deployment('Full tenant git data', {
      gitData: tenant.vercelProjectGitRepository,
    })

    // Always use project ID for consistency
    const projectId = tenant.vercelProjectId

    // Prepare deployment request body with required Vercel fields
    const requestBody = {
      name: deploymentData?.name || `${tenant.name}-deployment`,
      project: projectId,
      target: deploymentData?.target || 'production',
      // Required Vercel fields - minimal deployment trigger
      files: [], // Empty files array for instant deployment
      // Add projectSettings to fix the 400 error
      projectSettings: {
        buildCommand: 'pnpm build:prod',
        devCommand: 'next dev --port $PORT',
        framework: 'nextjs',
        installCommand: 'pnpm install',
        outputDirectory: null,
        rootDirectory: null,
      },
      // Add skipAutoDetectionConfirmation to prevent framework detection issues
      skipAutoDetectionConfirmation: true,
      ...deploymentData, // Allow custom overrides
    }

    // Only add gitSource if we have valid repository information and repoId
    if (
      tenant.vercelProjectGitRepository?.owner &&
      tenant.vercelProjectGitRepository?.repo &&
      repoId
    ) {
      const branch = tenant.vercelProjectGitRepository?.branch || 'main'

      logger.deployment('Adding git source', {
        type: 'github',
        owner: tenant.vercelProjectGitRepository.owner,
        ref: branch,
        repo: tenant.vercelProjectGitRepository.repo,
        repoId,
      })

      requestBody.gitSource = {
        type: 'github',
        ref: branch,
        repoId, // Use the actual repoId from tenant collection
      }
    } else {
      logger.deployment('No git source specified - missing owner, repo, or repoId')
    }

    logger.deployment('Deployment request body', { requestBody })

    // Create deployment on Vercel using git source only
    logger.deployment('Triggering Vercel deployment...')
    logger.deployment('Attempting deployment with git source...')

    const result = await vercel.deployments.createDeployment({
      requestBody,
      teamId,
    })

    logger.deployment('Deployment succeeded with git source')
    logger.deployment('Vercel deployment triggered successfully', {
      id: result.id,
      name: result.name,
      readyState: result.readyState,
      status: result.status,
      url: result.url,
    })

    // Stop here - return immediately
    return Response.json({
      deployment: {
        id: result.id,
        name: result.name,
        readyState: result.readyState,
        status: result.status,
        url: result.url,
      },
      success: true,
    })
  }, 'createDeployment')
}
