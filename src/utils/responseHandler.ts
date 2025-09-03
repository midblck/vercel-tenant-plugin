// ============================================================================
// STANDARDIZED RESPONSE HANDLING
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Standard response interface for all Vercel API operations
 */
export interface StandardResponse<T = any> {
  data: null | T
  error: null | string
  success: boolean
  timestamp: string
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T): StandardResponse<T> {
  return {
    data,
    error: null,
    success: true,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: string): StandardResponse {
  return {
    data: null,
    error,
    success: false,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Creates a standardized error response from an Error object
 */
export function createErrorResponseFromError(error: Error): StandardResponse {
  return createErrorResponse(error.message)
}
