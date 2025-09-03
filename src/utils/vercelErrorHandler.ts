// ============================================================================
// VERCEL ERROR HANDLING UTILITIES
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extracts a user-friendly error message from Vercel API errors
 * Handles various error formats that Vercel API can return
 */
export function extractVercelErrorMessage(error: any): string {
  if (error?.body) {
    try {
      const errorBody = JSON.parse(error.body)
      if (errorBody.error && errorBody.error.message) {
        return errorBody.error.message
      } else if (errorBody.error) {
        return errorBody.error
      } else {
        return errorBody
      }
    } catch {
      // If JSON parsing fails, use the body as-is
      return error.body
    }
  }

  if (error?.statusCode && error?.message) {
    // Handle VercelBadRequestError and similar
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error occurred'
}

/**
 * Extracts HTTP status code from Vercel API errors
 */
export function extractStatusCode(error: any): number {
  return error?.statusCode || error?.status || 500
}

/**
 * Creates a standardized error response for Vercel API operations
 */
export function createVercelErrorResponse(error: any): {
  data: null
  error: string
  success: false
} {
  return {
    data: null,
    error: extractVercelErrorMessage(error),
    success: false,
  }
}
