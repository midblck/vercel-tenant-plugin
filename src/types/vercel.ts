// ============================================================================
// VERCEL TYPES - Core Vercel API and SDK types
// ============================================================================

// ============================================================================
// CORE VERCEL API TYPES
// ============================================================================

export interface VercelProject {
  createdAt: number
  crons?: VercelCrons
  domains?: VercelDomain[]
  environment?: string
  framework?: string
  id: string
  latestDeployments?: VercelDeployment[]
  link?: VercelGitLink
  name: string
  teamId?: string
  updatedAt: number
  url?: string
}

export interface VercelDomain {
  apexName?: string
  createdAt?: number
  customEnvironmentId?: string
  gitBranch?: string
  name: string
  projectId?: string
  redirect?: string
  redirectStatusCode?: number
  updatedAt?: number
  verified: boolean
}

export interface VercelGitLink {
  branch: string
  org?: string
  owner: string
  productionBranch?: string
  repo: string
  repoId?: number
  repoOwnerId?: number
  type: 'bitbucket' | 'github' | 'github-limited' | 'gitlab'
}

export interface VercelDeployment {
  createdAt: number
  id: string
  readyState: 'BUILDING' | 'CANCELED' | 'ERROR' | 'QUEUED' | 'READY'
  readySubstate?: string
  updatedAt: number
}

export interface VercelCronDefinition {
  host: string
  path: string
  schedule: string
}

export interface VercelCrons {
  definitions?: VercelCronDefinition[]
  deploymentId?: string
  disabledAt?: number
  enabledAt?: number
  updatedAt?: number
}

// ============================================================================
// VERCEL ENVIRONMENT VARIABLE TYPES
// ============================================================================

export interface VercelEnvironmentVariable {
  comment?: string
  configurationId?: string
  contentHint?: {
    storeId?: string
    type: string
  }
  createdAt: number
  createdBy?: string
  customEnvironmentIds?: string[]
  decrypted?: boolean
  edgeConfigId?: string
  edgeConfigTokenId?: string
  gitBranch?: string
  id: string
  internalContentHint?: {
    encryptedValue?: string
    type: string
  }
  key: string
  sunsetSecretId?: string
  system?: boolean
  target: string[]
  type: 'encrypted' | 'plain' | 'secret' | 'system'
  updatedAt: number
  updatedBy?: string
  value?: string
  vsmValue?: string
}

// ============================================================================
// VERCEL CONFIGURATION TYPES
// ============================================================================

export interface VercelClientConfig {
  teamId?: string
  vercelToken: string
}

export interface VercelEnvironment {
  VERCEL_TEAM_ID?: string
  VERCEL_TOKEN: string
}

// ============================================================================
// VERCEL PROJECT CREATION TYPES
// ============================================================================

export interface CreateProjectRequest {
  buildCommand?: string
  gitRepository?: {
    repo: string
    type: 'bitbucket' | 'github' | 'github-limited' | 'gitlab'
  }
  installCommand?: string
  name: string
}

// ============================================================================
// VERCEL API RESPONSE TYPES
// ============================================================================

export interface VercelApiResponse<T> {
  data: null | T
  error: null | string
  success: boolean
}

export type GetProjectsResponse = VercelApiResponse<VercelProject[]>
export type CreateProjectResponse = VercelApiResponse<VercelProject>
export type GetEnvironmentVariablesResponse = VercelApiResponse<VercelEnvironmentVariable[]>

// ============================================================================
// VERCEL ENHANCED TYPES (Extended for our use cases)
// ============================================================================

export interface VercelAnalytics {
  [key: string]: unknown
  enabled?: boolean
  id?: string
}

export interface VercelFeatures {
  [featureName: string]: boolean | number | object | string
}

export interface VercelGitComments {
  onCommit?: boolean
  onPullRequest?: boolean
}

export interface VercelGitProviderOptions {
  createDeployments?: string
  disableRepositoryDispatchEvents?: boolean
}

export interface VercelPasswordProtection {
  [key: string]: unknown
  enabled?: boolean
  password?: string
}

export interface VercelResourceConfig {
  [key: string]: unknown
  cpu?: string
  memory?: string
}

export interface VercelDeploymentExpiration {
  [key: string]: unknown
  days?: number
  enabled?: boolean
}

export interface VercelRollingRelease {
  [key: string]: unknown
  enabled?: boolean
}

export interface VercelSecurity {
  [key: string]: unknown
  enabled?: boolean
}

export interface VercelSpeedInsights {
  [key: string]: unknown
  enabled?: boolean
}

export interface VercelSSOProtection {
  [key: string]: unknown
  enabled?: boolean
}

export interface VercelTrustedIps {
  [key: string]: unknown
  enabled?: boolean
  ips?: string[]
}

export interface VercelWebAnalytics {
  [key: string]: unknown
  enabled?: boolean
}

export interface VercelCustomEnvironment {
  [key: string]: unknown
  id: string
  name: string
}

export interface VercelDeployHook {
  [key: string]: unknown
  id: string
  name: string
  url: string
}

// Enhanced Vercel Project type that includes all fields we use in our mappers
export interface EnhancedVercelProject extends VercelProject {
  // Analytics and monitoring
  analytics?: VercelAnalytics
  // Environment and deployment settings
  autoAssignCustomDomains?: boolean
  autoExposeSystemEnvs?: boolean
  // Build and development configuration
  buildCommand?: string
  connectBuildsEnabled?: boolean
  connectConfigurationId?: string
  customEnvironments?: VercelCustomEnvironment[]
  // Resource configuration
  defaultResourceConfig?: VercelResourceConfig
  deploymentExpiration?: VercelDeploymentExpiration
  devCommand?: string
  // Project settings and features
  directoryListing?: boolean
  features?: VercelFeatures
  // Git protection and settings
  gitComments?: VercelGitComments
  gitForkProtection?: boolean
  gitLFS?: boolean
  gitProviderOptions?: VercelGitProviderOptions
  installCommand?: string
  live?: boolean
  nodeVersion?: string
  outputDirectory?: string
  // Security and access control
  passwordProtection?: VercelPasswordProtection
  paused?: boolean
  publicSource?: boolean
  resourceConfig?: VercelResourceConfig
  rollingRelease?: VercelRollingRelease
  rootDirectory?: string
  // Additional fields
  security?: VercelSecurity
  speedInsights?: VercelSpeedInsights
  ssoProtection?: VercelSSOProtection
  status?: string
  tier?: string
  // Transfer information
  transferCompletedAt?: number
  transferredFromAccountId?: string
  transferStartedAt?: number
  transferToAccountId?: string
  trustedIps?: VercelTrustedIps
  v0?: boolean
  webAnalytics?: VercelWebAnalytics
}

// Enhanced Vercel Domain type
export interface EnhancedVercelDomain extends VercelDomain {
  // Additional fields we might need
  apexName?: string
  createdAt?: number
  projectId?: string
  updatedAt?: number
}

// Enhanced Vercel Git Link type
export interface EnhancedVercelGitLink {
  // Base VercelGitLink fields
  branch: string
  // Additional fields we use
  createdAt?: number
  deployHooks?: VercelDeployHook[]
  gitCredentialId?: string
  org?: string
  owner: string
  productionBranch?: string
  repo: string
  repoId?: number
  repoOwnerId?: number
  type: 'bitbucket' | 'github' | 'github-limited' | 'gitlab'
  updatedAt?: number
}

// Enhanced Vercel Crons type
export interface EnhancedVercelCrons extends VercelCrons {
  // Additional fields we use
  definitions?: VercelCronDefinition[]
  deploymentId?: string
  disabledAt?: number
  enabledAt?: number
  updatedAt?: number
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if an object is an EnhancedVercelProject
 */
export function isEnhancedVercelProject(obj: unknown): obj is EnhancedVercelProject {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).name === 'string'
  )
}

/**
 * Type guard to check if an object is an EnhancedVercelDomain
 */
export function isEnhancedVercelDomain(obj: unknown): obj is EnhancedVercelDomain {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'name' in obj &&
    'verified' in obj &&
    typeof (obj as Record<string, unknown>).name === 'string' &&
    typeof (obj as Record<string, unknown>).verified === 'boolean'
  )
}

/**
 * Type guard to check if an object is an EnhancedVercelGitLink
 */
export function isEnhancedVercelGitLink(obj: unknown): obj is EnhancedVercelGitLink {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    'repo' in obj &&
    typeof (obj as Record<string, unknown>).type === 'string' &&
    typeof (obj as Record<string, unknown>).repo === 'string'
  )
}
