/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vercel } from '@vercel/sdk'

import type { TransformedVercelProject } from '../types'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getVercelCredentials = () => {
  // Environment check - removed console.log for production readiness
  const vercelToken = process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID

  if (!vercelToken) {
    throw new Error(
      'Vercel token not configured in backend. Please set VERCEL_TOKEN environment variable or configure the plugin with vercelToken option.',
    )
  }

  // Create Vercel SDK instance
  const vercel = new Vercel({
    bearerToken: vercelToken,
  })

  return { teamId, vercel, vercelToken }
}

export const transformVercelProject = (project: any): TransformedVercelProject => {
  // Determine the correct project URL based on domains and project data
  let projectUrl = ''

  if (project.domains && project.domains.length > 0) {
    // Use the first verified domain, or first domain if none verified
    const verifiedDomain = project.domains.find((domain: any) => domain.verified)
    projectUrl = verifiedDomain
      ? `https://${verifiedDomain.name}`
      : `https://${project.domains[0].name}`
  } else if (project.url) {
    // Use the project URL if available
    projectUrl = project.url
  } else {
    // Fallback to default vercel.app URL
    projectUrl = `https://${project.name}.vercel.app`
  }

  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    crons:
      project.crons && typeof project.crons === 'object'
        ? {
            definitions:
              project.crons.definitions && Array.isArray(project.crons.definitions)
                ? project.crons.definitions.map((def: any) => ({
                    host: def && typeof def === 'object' ? def.host || null : null,
                    path: def && typeof def === 'object' ? def.path || null : null,
                    schedule: def && typeof def === 'object' ? def.schedule || null : null,
                  }))
                : [],
            deploymentId: project.crons.deploymentId || null,
            disabledAt: project.crons.disabledAt || null,
            enabledAt: project.crons.enabledAt || null,
            updatedAt: project.crons.updatedAt || null,
          }
        : null,
    domains: project.domains || [],
    environment: project.environment || 'production',
    framework: project.framework,
    gitRepository: project.link
      ? {
          type: project.link.type,
          branch: project.link.productionBranch,
          owner: project.link.org,
          repo: project.link.repo,
          repoId: project.link.repoId,
          repoOwnerId: project.link.repoOwnerId,
        }
      : null,
    status: project.latestDeployments?.[0]?.readyState || 'unknown',
    teamId: project.teamId,
    updatedAt: project.updatedAt,
    url: projectUrl,
  }
}
