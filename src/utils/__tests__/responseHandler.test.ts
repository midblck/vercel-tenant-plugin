// ============================================================================
// RESPONSE HANDLER TESTS
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  createSuccessResponse,
  createErrorResponse,
  createErrorResponseFromError,
} from '../responseHandler'

describe('ResponseHandler', () => {
  describe('createSuccessResponse', () => {
    it('should create standardized success response with data', () => {
      const data = { id: '123', name: 'test' }
      const result = createSuccessResponse(data)

      expect(result).toEqual({
        data,
        error: null,
        success: true,
        timestamp: expect.any(String),
      })
    })

    it('should create standardized success response with null data', () => {
      const result = createSuccessResponse(null)

      expect(result).toEqual({
        data: null,
        error: null,
        success: true,
        timestamp: expect.any(String),
      })
    })

    it('should include valid timestamp', () => {
      const result = createSuccessResponse({})
      const timestamp = new Date(result.timestamp)

      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('createErrorResponse', () => {
    it('should create standardized error response', () => {
      const errorMessage = 'Test error message'
      const result = createErrorResponse(errorMessage)

      expect(result).toEqual({
        data: null,
        error: errorMessage,
        success: false,
        timestamp: expect.any(String),
      })
    })

    it('should include valid timestamp', () => {
      const result = createErrorResponse('Test error')
      const timestamp = new Date(result.timestamp)

      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('createErrorResponseFromError', () => {
    it('should create error response from Error object', () => {
      const error = new Error('Test error message')
      const result = createErrorResponseFromError(error)

      expect(result).toEqual({
        data: null,
        error: 'Test error message',
        success: false,
        timestamp: expect.any(String),
      })
    })
  })
})
