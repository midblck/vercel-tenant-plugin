// ============================================================================
// API TYPES - API response and request type definitions
// ============================================================================

import type { VercelCrons, VercelDomain, VercelGitLink } from './vercel'

// ============================================================================
// TRANSFORMED PROJECT TYPES (for frontend consumption)
// ============================================================================

export interface TransformedVercelProject {
  createdAt: number
  crons?: null | VercelCrons
  domains: VercelDomain[]
  environment: string
  framework?: string
  gitRepository: null | VercelGitLink
  id: string
  name: string
  status: string
  teamId?: string
  updatedAt: number
  url: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ListProjectsResponse {
  data: TransformedVercelProject[]
  success: boolean
  total: number
}

export interface ErrorResponse {
  error: string
  status?: number
  success: false
}

// ============================================================================
// UNION TYPES
// ============================================================================

export type VercelApiEndpointResponse =
  | import('./tenant').CreateTenantResponse
  | ErrorResponse
  | ListProjectsResponse
  | import('./environment').SyncEnvironmentVariablesResponse
  | import('./tenant').SyncProjectsResponse
