// ============================================================================
// TYPES INDEX - Central export for all type definitions
// ============================================================================

// ============================================================================
// VERCEL TYPES
// ============================================================================
export type {
  // Core Vercel API Types
  VercelProject,
  VercelDomain,
  VercelGitLink,
  VercelDeployment,
  VercelCronDefinition,
  VercelCrons,
  VercelEnvironmentVariable,
  VercelClientConfig,
  VercelEnvironment,
  CreateProjectRequest,
  VercelApiResponse,
  GetProjectsResponse,
  CreateProjectResponse,
  GetEnvironmentVariablesResponse,

  // Enhanced Vercel Types
  VercelAnalytics,
  VercelFeatures,
  VercelGitComments,
  VercelGitProviderOptions,
  VercelPasswordProtection,
  VercelResourceConfig,
  VercelDeploymentExpiration,
  VercelRollingRelease,
  VercelSecurity,
  VercelSpeedInsights,
  VercelSSOProtection,
  VercelTrustedIps,
  VercelWebAnalytics,
  VercelCustomEnvironment,
  VercelDeployHook,
  EnhancedVercelProject,
  EnhancedVercelDomain,
  EnhancedVercelGitLink,
  EnhancedVercelCrons,
} from './vercel'

export {
  // Type Guards
  isEnhancedVercelProject,
  isEnhancedVercelDomain,
  isEnhancedVercelGitLink,
} from './vercel'

// ============================================================================
// TENANT TYPES
// ============================================================================
export type {
  TenantData,
  CreateTenantRequest,
  CreateTenantResponse,
  TenantHookContext,
  SyncResult,
  SyncProjectsResponse,
} from './tenant'

// ============================================================================
// ENVIRONMENT VARIABLE TYPES
// ============================================================================
export type {
  EnvironmentVariableTarget,
  EnvironmentVariableData,
  ProcessedEnvironmentVariable,
  CreateEnvVarsRequest,
  CreateEnvVarsResponse,
  EnvironmentVariableSyncResult,
  SyncEnvironmentVariablesRequest,
  SyncEnvironmentVariablesResponse,
} from './environment'

// ============================================================================
// API TYPES
// ============================================================================
export type {
  TransformedVercelProject,
  ListProjectsResponse,
  ErrorResponse,
  VercelApiEndpointResponse,
} from './api'

// ============================================================================
// COMMON TYPES
// ============================================================================
export type {
  PayloadRequestWithUser,
  ValidationResult,
  ValidationFunction,
  ValidationSchema,
  ErrorData,
  VercelErrorResponse,
  LogContext,
  DeepPartial,
  NonNullable,
} from './common'

// ============================================================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================
// These exports maintain backward compatibility with existing imports
export type {
  // Vercel types (previously in vercelTypes.ts)
  VercelProject as VercelProjectType,
  VercelDomain as VercelDomainType,
  VercelGitLink as VercelGitLinkType,
  VercelDeployment as VercelDeploymentType,
  VercelCronDefinition as VercelCronDefinitionType,
  VercelCrons as VercelCronsType,
  VercelEnvironmentVariable as VercelEnvironmentVariableType,
  VercelClientConfig as VercelClientConfigType,
  VercelEnvironment as VercelEnvironmentType,
  CreateProjectRequest as CreateProjectRequestType,
  VercelApiResponse as VercelApiResponseType,
  GetProjectsResponse as GetProjectsResponseType,
  CreateProjectResponse as CreateProjectResponseType,
  GetEnvironmentVariablesResponse as GetEnvironmentVariablesResponseType,
} from './vercel'

export type {
  // Tenant types
  TenantData as TenantDataType,
  CreateTenantRequest as CreateTenantRequestType,
  CreateTenantResponse as CreateTenantResponseType,
  TenantHookContext as TenantHookContextType,
  SyncResult as SyncResultType,
  SyncProjectsResponse as SyncProjectsResponseType,
} from './tenant'

export type {
  // Environment variable types
  EnvironmentVariableTarget as EnvironmentVariableTargetType,
  EnvironmentVariableData as EnvironmentVariableDataType,
  ProcessedEnvironmentVariable as ProcessedEnvironmentVariableType,
  CreateEnvVarsRequest as CreateEnvVarsRequestType,
  CreateEnvVarsResponse as CreateEnvVarsResponseType,
  EnvironmentVariableSyncResult as EnvironmentVariableSyncResultType,
  SyncEnvironmentVariablesRequest as SyncEnvironmentVariablesRequestType,
  SyncEnvironmentVariablesResponse as SyncEnvironmentVariablesResponseType,
} from './environment'

export type {
  // API types
  TransformedVercelProject as TransformedVercelProjectType,
  ListProjectsResponse as ListProjectsResponseType,
  ErrorResponse as ErrorResponseType,
  VercelApiEndpointResponse as VercelApiEndpointResponseType,
} from './api'
