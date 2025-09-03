// ============================================================================
// COMMON TYPES - Shared utility types and interfaces
// ============================================================================

import type { PayloadRequest } from 'payload'

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface PayloadRequestWithUser extends Omit<PayloadRequest, 'user'> {
  cronUpdateResult?: {
    cronStatus: 'disabled' | 'enabled'
    message: string
    success: boolean
    tenantId: string
    tenantName: string
    timestamp: string
  }
  isSystemOperation?: boolean
  user?: {
    [key: string]: unknown
    email: string
    id: string
  } | null
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  errors: string[]
  isValid: boolean
}

export type ValidationFunction<T = unknown> = (value: T) => ValidationResult

export interface ValidationSchema {
  [key: string]: ValidationFunction
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ErrorData {
  [key: string]: unknown
}

export interface VercelErrorResponse {
  error: {
    [key: string]: unknown
    code?: string
    message: string
  }
  status?: number
}

// ============================================================================
// LOGGER TYPES
// ============================================================================

export interface LogContext {
  [key: string]: unknown
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type NonNullable<T> = T extends null | undefined ? never : T

// ============================================================================
// GLOBAL TYPES
// ============================================================================

declare global {
  var rapidUpdateCache: Record<string, number>
}
