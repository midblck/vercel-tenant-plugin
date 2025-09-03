// ============================================================================
// VERCEL ERROR HANDLER TESTS
// ============================================================================

import { describe, expect, it } from 'vitest'
import { createVercelErrorResponse, extractVercelErrorMessage } from '../vercelErrorHandler'

describe('VercelErrorHandler', () => {
  describe('extractVercelErrorMessage', () => {
    it('should extract error message from Vercel API error with body', () => {
      const error = {
        body: JSON.stringify({
          error: {
            message: 'Project not found',
          },
        }),
      }

      const result = extractVercelErrorMessage(error)
      expect(result).toBe('Project not found')
    })

    it('should extract error message from Vercel API error with direct error', () => {
      const error = {
        body: JSON.stringify({
          error: 'Invalid token',
        }),
      }

      const result = extractVercelErrorMessage(error)
      expect(result).toBe('Invalid token')
    })

    it('should handle VercelBadRequestError format', () => {
      const error = {
        message: 'Bad request',
        statusCode: 400,
      }

      const result = extractVercelErrorMessage(error)
      expect(result).toBe('Bad request')
    })

    it('should handle standard Error objects', () => {
      const error = new Error('Standard error message')

      const result = extractVercelErrorMessage(error)
      expect(result).toBe('Standard error message')
    })

    it('should handle invalid JSON in body', () => {
      const error = {
        body: 'Invalid JSON string',
      }

      const result = extractVercelErrorMessage(error)
      expect(result).toBe('Invalid JSON string')
    })

    it('should return default message for unknown error types', () => {
      const error = {}

      const result = extractVercelErrorMessage(error)
      expect(result).toBe('Unknown error occurred')
    })
  })

  describe('createVercelErrorResponse', () => {
    it('should create standardized error response', () => {
      const error = {
        body: JSON.stringify({
          error: {
            message: 'Test error',
          },
        }),
      }

      const result = createVercelErrorResponse(error)

      expect(result).toEqual({
        data: null,
        error: 'Test error',
        success: false,
      })
    })
  })
})
