// ============================================================================
// ENVIRONMENT VARIABLE TYPES - Environment variable related definitions
// ============================================================================

// ============================================================================
// ENVIRONMENT VARIABLE DATA TYPES
// ============================================================================

export interface EnvironmentVariableTarget {
  target: 'development' | 'preview' | 'production'
}

export interface EnvironmentVariableData {
  comment?: string
  gitBranch?: string
  isEncrypted?: boolean
  key: string
  targets: EnvironmentVariableTarget[]
  type: 'encrypted' | 'plain' | 'secret' | 'system'
  value: string
}

export interface ProcessedEnvironmentVariable extends EnvironmentVariableData {
  error?: string
  status?: 'created' | 'error' | 'skipped' | 'updated'
  vercelId?: string
}

// ============================================================================
// ENVIRONMENT VARIABLE REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateEnvVarsRequest {
  existingDocId?: string
  existingEnvVars?: EnvironmentVariableData[]
  tenantId?: string
}

export interface CreateEnvVarsResponse {
  message: string
  results: Array<{
    created: number
    errors?: string[]
    processedEnvVars?: ProcessedEnvironmentVariable[]
    projectId: string
    status: 'error' | 'success'
    tenant: string
    vercelIds?: Array<{ key: string; vercelId: string }>
  }>
  success: boolean
  total: number
}

// ============================================================================
// ENVIRONMENT VARIABLE SYNC TYPES
// ============================================================================

export interface EnvironmentVariableSyncResult {
  error?: string
  key: string
  localId?: string
  status: 'created' | 'deleted' | 'error' | 'updated'
  vercelId?: string
}

export interface SyncEnvironmentVariablesRequest {
  environment?: 'development' | 'preview' | 'production'
  projectId: string
  tenantId: string
}

export interface SyncEnvironmentVariablesResponse {
  message: string
  results: EnvironmentVariableSyncResult[]
  success: boolean
  total: number
}
