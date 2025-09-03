// ============================================================================
// VERCEL DATA MAPPING UTILITY - REFACTORED
// ============================================================================

import type {
  EnhancedVercelDomain,
  EnhancedVercelGitLink,
  EnhancedVercelProject,
  VercelCronDefinition,
  // VercelProject, // Unused import
} from '../types'

/**
 * Maps basic project information from Vercel project data
 *
 * @param project - The Vercel project data to map
 * @param currentProjectStatus - Optional current project status to override the default
 * @returns Object containing basic project information fields
 *
 * @example
 * ```typescript
 * const basicInfo = mapBasicProjectInfo(vercelProject, 'READY')
 * // Returns: { vercelProjectCreatedAt, vercelProjectStatus, vercelProjectUpdatedAt, ... }
 * ```
 */
export function mapBasicProjectInfo(project: EnhancedVercelProject, currentProjectStatus?: string) {
  return {
    // Basic project information
    vercelProjectCreatedAt: project.createdAt ? new Date(project.createdAt).toISOString() : null,
    vercelProjectStatus:
      currentProjectStatus || project.latestDeployments?.[0]?.readyState || 'unknown',
    vercelProjectUpdatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : null,

    // Environment and framework
    vercelProjectEnvironment: project.environment || 'production',
    vercelProjectFramework: project.framework || null,
  }
}

/**
 * Maps build and development configuration from Vercel project data
 */
export function mapBuildConfiguration(project: EnhancedVercelProject) {
  return {
    // Build and development configuration
    buildCommand: project.buildCommand || null,
    devCommand: project.devCommand || null,
    installCommand: project.installCommand || null,
    nodeVersion: project.nodeVersion || null,
    outputDirectory: project.outputDirectory || null,
    rootDirectory: project.rootDirectory || null,
  }
}

/**
 * Maps project settings and features from Vercel project data
 */
export function mapProjectSettings(project: EnhancedVercelProject) {
  return {
    // Project settings and features
    directoryListing: project.directoryListing || false,
    features: project.features || null,
    live: project.live || false,
    paused: project.paused || false,
    publicSource: project.publicSource || false,
    tier: project.tier || 'standard',
    v0: project.v0 || false,
  }
}

/**
 * Maps Git repository configuration from Vercel project data
 */
export function mapGitRepository(project: EnhancedVercelProject) {
  return {
    // Git repository configuration
    vercelProjectGitRepository: project.link
      ? {
          type: project.link.type,
          branch: project.link.productionBranch || project.link.branch,
          createdAt: (project.link as EnhancedVercelGitLink).createdAt
            ? new Date((project.link as EnhancedVercelGitLink).createdAt!).toISOString()
            : null,
          deployHooks: (project.link as EnhancedVercelGitLink).deployHooks || [],
          gitCredentialId: (project.link as EnhancedVercelGitLink).gitCredentialId,
          owner: project.link.org || project.link.owner,
          repo: project.link.repo,
          repoId: project.link.repoId,
          repoOwnerId: project.link.repoOwnerId,
          updatedAt: (project.link as EnhancedVercelGitLink).updatedAt
            ? new Date((project.link as EnhancedVercelGitLink).updatedAt!).toISOString()
            : null,
        }
      : null,

    // Git protection and settings
    gitComments: project.gitComments || {
      onCommit: false,
      onPullRequest: false,
    },
    gitForkProtection: project.gitForkProtection || false,
    gitLFS: project.gitLFS || false,
    gitProviderOptions: project.gitProviderOptions || {
      createDeployments: null,
      disableRepositoryDispatchEvents: false,
    },
  }
}

/**
 * Maps security and access control from Vercel project data
 */
export function mapSecuritySettings(project: EnhancedVercelProject) {
  return {
    // Security and access control
    passwordProtection: project.passwordProtection || null,
    ssoProtection: project.ssoProtection || null,
  }
}

/**
 * Maps analytics and monitoring from Vercel project data
 */
export function mapAnalyticsAndMonitoring(project: EnhancedVercelProject) {
  return {
    // Analytics and monitoring
    analytics: project.analytics || null,
    speedInsights: project.speedInsights || null,
    webAnalytics: project.webAnalytics || null,
  }
}

/**
 * Maps resource configuration from Vercel project data
 */
export function mapResourceConfiguration(project: EnhancedVercelProject) {
  return {
    // Resource configuration
    defaultResourceConfig: project.defaultResourceConfig || null,
    resourceConfig: project.resourceConfig || null,
  }
}

/**
 * Maps environment and deployment settings from Vercel project data
 */
export function mapDeploymentSettings(project: EnhancedVercelProject) {
  return {
    // Environment and deployment settings
    autoAssignCustomDomains: project.autoAssignCustomDomains || null,
    autoExposeSystemEnvs: project.autoExposeSystemEnvs || null,
    connectBuildsEnabled: project.connectBuildsEnabled || null,
    connectConfigurationId: project.connectConfigurationId || null,
    customEnvironments: project.customEnvironments || null,
    deploymentExpiration: project.deploymentExpiration || null,
    rollingRelease: project.rollingRelease || null,
  }
}

/**
 * Maps transfer information from Vercel project data
 */
export function mapTransferInformation(project: EnhancedVercelProject) {
  return {
    // Transfer information
    transferCompletedAt:
      project.transferCompletedAt && project.transferCompletedAt > 0
        ? new Date(project.transferCompletedAt).toISOString()
        : undefined,
    transferredFromAccountId: project.transferredFromAccountId || null,
    transferStartedAt:
      project.transferStartedAt && project.transferStartedAt > 0
        ? new Date(project.transferStartedAt).toISOString()
        : undefined,
    transferToAccountId: project.transferToAccountId || null,
  }
}

/**
 * Maps cron jobs information from Vercel project data
 */
export function mapCronJobs(project: EnhancedVercelProject) {
  return {
    // Cron jobs information
    vercelProjectCrons:
      project.crons && typeof project.crons === 'object'
        ? {
            definitions: (() => {
              if (project.crons.definitions && Array.isArray(project.crons.definitions)) {
                return project.crons.definitions.map((def: VercelCronDefinition) => ({
                  host: def && typeof def === 'object' ? def.host || null : null,
                  path: def && typeof def === 'object' ? def.path || null : null,
                  schedule: def && typeof def === 'object' ? def.schedule || null : null,
                }))
              }
              return []
            })(),
            deploymentId: project.crons.deploymentId || null,
            disabledAt: project.crons.disabledAt
              ? new Date(project.crons.disabledAt).toISOString()
              : null,
            enabledAt: project.crons.enabledAt
              ? new Date(project.crons.enabledAt).toISOString()
              : null,
            updatedAt: project.crons.updatedAt
              ? new Date(project.crons.updatedAt).toISOString()
              : null,
          }
        : null,
  }
}

/**
 * Maps domains information from Vercel project data
 */
export function mapDomains(domainsArray: EnhancedVercelDomain[], project: EnhancedVercelProject) {
  return {
    // Domains information
    vercelProjectDomains: domainsArray.map((domain: EnhancedVercelDomain) => ({
      domain: domain.name,
      verified: domain.verified || false,
    })),

    // Project URL
    vercelProjectUrl: (() => {
      // Priority: custom domain > project URL > default vercel.app URL
      let url = ''

      if (domainsArray.length > 0) {
        // Use the first verified domain, or first domain if none verified
        const verifiedDomain = domainsArray.find((domain: EnhancedVercelDomain) => domain.verified)
        url = verifiedDomain ? `https://${verifiedDomain.name}` : `https://${domainsArray[0].name}`
      } else if (project.url) {
        // Use the project URL if available
        url = project.url
      } else {
        // Fallback to default vercel.app URL
        url = `https://${project.name}.vercel.app`
      }

      return url
    })(),
  }
}

/**
 * Maps complete Vercel data for reference storage
 */
export function mapCompleteVercelData(
  project: EnhancedVercelProject,
  domainsArray: EnhancedVercelDomain[],
  currentProjectStatus?: string,
) {
  return {
    // 🚀 MIRROR COMPLETE VERCEL DATA: Store the exact Vercel response for reference
    lastSyncData: {
      // Core project information
      environment: project.environment || 'production',
      framework: project.framework,
      projectId: project.id,
      projectName: project.name,
      status: currentProjectStatus || project.latestDeployments?.[0]?.readyState || 'unknown',

      // Domains
      domains: domainsArray.map((domain: EnhancedVercelDomain) => ({
        name: domain.name,
        apexName: domain.apexName,
        createdAt: domain.createdAt,
        projectId: domain.projectId,
        updatedAt: domain.updatedAt,
        verified: domain.verified,
      })),

      // Build configuration
      buildCommand: project.buildCommand,
      devCommand: project.devCommand,
      installCommand: project.installCommand,
      nodeVersion: project.nodeVersion,
      outputDirectory: project.outputDirectory,
      rootDirectory: project.rootDirectory,

      // Git repository
      gitRepository: project.link
        ? {
            type: project.link.type,
            org: project.link.org,
            productionBranch: project.link.productionBranch,
            repo: project.link.repo,
            repoId: project.link.repoId,
            repoOwnerId: project.link.repoOwnerId,
          }
        : null,

      // Cron jobs
      crons: project.crons
        ? {
            definitions: project.crons.definitions || [],
            disabledAt: project.crons.disabledAt,
            enabledAt: project.crons.enabledAt,
          }
        : null,

      // Project settings
      directoryListing: project.directoryListing,
      live: project.live,
      paused: project.paused,
      publicSource: project.publicSource,
      tier: project.tier,

      // Additional Vercel fields
      analytics: project.analytics,
      autoAssignCustomDomains: project.autoAssignCustomDomains,
      autoExposeSystemEnvs: project.autoExposeSystemEnvs,
      connectBuildsEnabled: project.connectBuildsEnabled,
      customEnvironments: project.customEnvironments,
      deploymentExpiration: project.deploymentExpiration,
      gitComments: project.gitComments,
      gitForkProtection: project.gitForkProtection,
      gitLFS: project.gitLFS,
      gitProviderOptions: project.gitProviderOptions,
      passwordProtection: project.passwordProtection,
      resourceConfig: project.resourceConfig,
      rollingRelease: project.rollingRelease,
      security: project.security,
      speedInsights: project.speedInsights,
      ssoProtection: project.ssoProtection,
      trustedIps: project.trustedIps,
      webAnalytics: project.webAnalytics,

      // Timestamps
      createdAt: project.createdAt,
      syncedAt: new Date().toISOString(),
      updatedAt: project.updatedAt,
    },
  }
}

/**
 * Maps Vercel project data to tenant collection fields
 * This ensures consistency between syncSingleProject and syncProjects
 *
 * @param project - The Vercel project data to map
 * @param domainsArray - Array of Vercel domain objects
 * @param currentProjectStatus - Optional current project status to override the default
 * @returns Complete tenant data object with all mapped Vercel fields
 *
 * @example
 * ```typescript
 * const tenantData = mapVercelDataToTenant(vercelProject, domains, 'READY')
 * // Returns: Complete tenant object with all Vercel data mapped
 * ```
 */
export function mapVercelDataToTenant(
  project: EnhancedVercelProject,
  domainsArray: EnhancedVercelDomain[],
  currentProjectStatus?: string,
) {
  return {
    ...mapBasicProjectInfo(project, currentProjectStatus),
    ...mapBuildConfiguration(project),
    ...mapProjectSettings(project),
    ...mapGitRepository(project),
    ...mapSecuritySettings(project),
    ...mapAnalyticsAndMonitoring(project),
    ...mapResourceConfiguration(project),
    ...mapDeploymentSettings(project),
    ...mapTransferInformation(project),
    ...mapCronJobs(project),
    ...mapDomains(domainsArray, project),
    ...mapCompleteVercelData(project, domainsArray, currentProjectStatus),
  }
}

/**
 * Creates new tenant data with comprehensive Vercel data mapping
 * Used when creating new tenants from Vercel projects
 */
export function createNewTenantData(
  project: EnhancedVercelProject,
  domainsArray: EnhancedVercelDomain[],
  teamId?: string,
) {
  return {
    name: project.name || `Project ${project.id}`,
    lastSynced: new Date().toISOString(),
    lastSyncMessage: `✅ New tenant created from Vercel project`,
    lastSyncStatus: 'synced',

    // Always set tenant status to approved when syncing from Vercel
    status: 'approved',

    // Set isActive to true by default (pause/unpause requires Vercel billing)
    isActive: true,

    // Team ID
    vercelTeamId: project.teamId || teamId,

    // CRITICAL: Set vercelProjectId to prevent hook from trying to create a new Vercel project
    vercelProjectId: project.id,

    // Flag to prevent infinite loops when this tenant is updated later
    _syncOrigin: 'vercel-sync',

    // Include all the mapped Vercel data
    ...mapVercelDataToTenant(project, domainsArray),
  }
}

/**
 * Updates existing tenant data with fresh Vercel data
 * Used when updating existing tenants during sync
 */
export function updateExistingTenantData(
  project: EnhancedVercelProject,
  domainsArray: EnhancedVercelDomain[],
  currentProjectStatus: string,
) {
  return {
    lastSynced: new Date().toISOString(),
    lastSyncMessage: `✅ Project data updated successfully`,
    lastSyncStatus: 'synced',

    // Always set status to approved when updating existing tenants during sync
    status: 'approved',

    // Flag to prevent infinite loops when this tenant is updated later
    _syncOrigin: 'vercel-sync',

    // Include all the mapped Vercel data
    ...mapVercelDataToTenant(project, domainsArray, currentProjectStatus),
  }
}
