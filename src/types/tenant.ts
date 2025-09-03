// ============================================================================
// TENANT TYPES - Tenant-related type definitions
// ============================================================================

import type { VercelCrons, VercelDomain, VercelGitLink } from './vercel'

// ============================================================================
// TENANT DATA TYPES
// ============================================================================

export interface TenantData {
  _originalDisableCron?: boolean
  _skipHooks?: boolean
  description?: string
  disableCron?: boolean
  id?: string
  isActive: boolean
  lastSynced: string
  name: string
  vercelProjectCreatedAt?: string
  vercelProjectCrons?: null | VercelCrons
  vercelProjectDomains: VercelDomain[]
  vercelProjectEnvironment: string
  vercelProjectFramework?: string
  vercelProjectGitRepository?: null | VercelGitLink
  vercelProjectId?: string
  vercelProjectName?: string
  vercelProjectStatus: string
  vercelProjectUpdatedAt?: string
  vercelProjectUrl?: string
  vercelTeamId?: string
}

// ============================================================================
// TENANT REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateTenantRequest {
  description?: string
  isActive?: boolean
  name: string
  tenantId?: string
}

export interface CreateTenantResponse {
  message: string
  success: boolean
  tenant: TenantData
  vercelProject: {
    framework?: string
    id: string
    name: string
    status: string
    url: string
  }
}

// ============================================================================
// TENANT HOOK CONTEXT TYPES
// ============================================================================

export interface TenantHookContext {
  doc: TenantData
  operation: 'create' | 'delete' | 'update'
  req: {
    payload: {
      update: (params: {
        collection: string
        data: Partial<TenantData>
        id: string
      }) => Promise<TenantData>
    }
  }
}

// ============================================================================
// TENANT SYNC TYPES
// ============================================================================

export interface SyncResult {
  data?: TenantData
  error?: string
  projectId: string
  projectName: string
  status: 'error' | 'synced'
  tenantId?: string
}

export interface SyncProjectsResponse {
  data: SyncResult[]
  message: string
  success: boolean
  total: number
}
