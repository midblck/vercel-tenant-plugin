// ============================================================================
// TYPES INDEX - Central export for all type definitions
// ============================================================================

// ============================================================================
// API TYPES
// ============================================================================
export type {
  ErrorResponse,
  ListProjectsResponse,
  TransformedVercelProject,
  VercelApiEndpointResponse,
} from './api'

export type {
  ErrorResponse as ErrorResponseType,
  ListProjectsResponse as ListProjectsResponseType,
  // API types
  TransformedVercelProject as TransformedVercelProjectType,
  VercelApiEndpointResponse as VercelApiEndpointResponseType,
} from './api'

// ============================================================================
// COMMON TYPES
// ============================================================================
export type {
  DeepPartial,
  ErrorData,
  LogContext,
  NonNullable,
  PayloadRequestWithUser,
  ValidationFunction,
  ValidationResult,
  ValidationSchema,
  VercelErrorResponse,
} from './common'

// ============================================================================
// ENVIRONMENT VARIABLE TYPES
// ============================================================================
export type {
  CreateEnvVarsRequest,
  CreateEnvVarsResponse,
  EnvironmentVariableData,
  EnvironmentVariableSyncResult,
  EnvironmentVariableTarget,
  ProcessedEnvironmentVariable,
  SyncEnvironmentVariablesRequest,
  SyncEnvironmentVariablesResponse,
} from './environment'

export type {
  CreateEnvVarsRequest as CreateEnvVarsRequestType,
  CreateEnvVarsResponse as CreateEnvVarsResponseType,
  EnvironmentVariableData as EnvironmentVariableDataType,
  EnvironmentVariableSyncResult as EnvironmentVariableSyncResultType,
  // Environment variable types
  EnvironmentVariableTarget as EnvironmentVariableTargetType,
  ProcessedEnvironmentVariable as ProcessedEnvironmentVariableType,
  SyncEnvironmentVariablesRequest as SyncEnvironmentVariablesRequestType,
  SyncEnvironmentVariablesResponse as SyncEnvironmentVariablesResponseType,
} from './environment'

// ============================================================================
// TENANT TYPES
// ============================================================================
export type {
  CreateTenantRequest,
  CreateTenantResponse,
  SyncProjectsResponse,
  SyncResult,
  TenantData,
  TenantHookContext,
} from './tenant'

export type {
  CreateTenantRequest as CreateTenantRequestType,
  CreateTenantResponse as CreateTenantResponseType,
  SyncProjectsResponse as SyncProjectsResponseType,
  SyncResult as SyncResultType,
  // Tenant types
  TenantData as TenantDataType,
  TenantHookContext as TenantHookContextType,
} from './tenant'

// ============================================================================
// VERCEL TYPES
// ============================================================================
export type {
  CreateProjectRequest,
  CreateProjectResponse,
  EnhancedVercelCrons,
  EnhancedVercelDomain,
  EnhancedVercelGitLink,
  EnhancedVercelProject,
  GetEnvironmentVariablesResponse,
  GetProjectsResponse,
  // Enhanced Vercel Types
  VercelAnalytics,
  VercelApiResponse,
  VercelClientConfig,
  VercelCronDefinition,
  VercelCrons,
  VercelCustomEnvironment,

  VercelDeployHook,
  VercelDeployment,
  VercelDeploymentExpiration,
  VercelDomain,
  VercelEnvironment,
  VercelEnvironmentVariable,
  VercelFeatures,
  VercelGitComments,
  VercelGitLink,
  VercelGitProviderOptions,
  VercelPasswordProtection,
  // Core Vercel API Types
  VercelProject,
  VercelResourceConfig,
  VercelRollingRelease,
  VercelSecurity,
  VercelSpeedInsights,
  VercelSSOProtection,
  VercelTrustedIps,
  VercelWebAnalytics,
} from './vercel'

export {
  isEnhancedVercelDomain,
  isEnhancedVercelGitLink,
  // Type Guards
  isEnhancedVercelProject,
} from './vercel'

// ============================================================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================
// These exports maintain backward compatibility with existing imports
export type {
  CreateProjectRequest as CreateProjectRequestType,
  CreateProjectResponse as CreateProjectResponseType,
  GetEnvironmentVariablesResponse as GetEnvironmentVariablesResponseType,
  GetProjectsResponse as GetProjectsResponseType,
  VercelApiResponse as VercelApiResponseType,
  VercelClientConfig as VercelClientConfigType,
  VercelCronDefinition as VercelCronDefinitionType,
  VercelCrons as VercelCronsType,
  VercelDeployment as VercelDeploymentType,
  VercelDomain as VercelDomainType,
  VercelEnvironment as VercelEnvironmentType,
  VercelEnvironmentVariable as VercelEnvironmentVariableType,
  VercelGitLink as VercelGitLinkType,
  // Vercel types (previously in vercelTypes.ts)
  VercelProject as VercelProjectType,
} from './vercel'
