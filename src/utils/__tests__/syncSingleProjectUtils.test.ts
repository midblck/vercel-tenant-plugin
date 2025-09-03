// ============================================================================
// SYNC SINGLE PROJECT UTILITIES TESTS
// ============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSyncResponse, validateSyncRequest } from '../syncSingleProjectUtils'

// Mock dependencies
vi.mock('../../endpoints/vercelClient')
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('SyncSingleProjectUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateSyncRequest', () => {
    it('should validate request with projectId in URL params', () => {
      const req = {
        body: {},
        url: 'https://example.com/api/sync?projectId=project-123',
      }

      const result = validateSyncRequest(req)

      expect(result).toEqual({
        projectId: 'project-123',
      })
    })

    it('should validate request with projectId in body', () => {
      const req = {
        body: { projectId: 'project-123' },
        url: 'https://example.com/api/sync',
      }

      const result = validateSyncRequest(req)

      expect(result).toEqual({
        projectId: 'project-123',
      })
    })

    it('should return error when projectId is missing', () => {
      const req = {
        body: {},
        url: 'https://example.com/api/sync',
      }

      const result = validateSyncRequest(req)

      expect(result).toEqual({
        error: 'ProjectId is required as query parameter or in request body',
        projectId: '',
      })
    })

    it('should return error when no URL and no body', () => {
      const req = {}

      const result = validateSyncRequest(req)

      expect(result).toEqual({
        error: 'ProjectId is required as query parameter or in request body',
        projectId: '',
      })
    })

    it('should prioritize URL params over body', () => {
      const req = {
        body: { projectId: 'body-project-123' },
        url: 'https://example.com/api/sync?projectId=url-project-123',
      }

      const result = validateSyncRequest(req)

      expect(result).toEqual({
        projectId: 'url-project-123',
      })
    })
  })

  describe('handleSyncResponse', () => {
    it('should handle successful sync response', () => {
      const result = { id: 'tenant-123', name: 'Test Tenant' }
      const projectId = 'project-123'
      const projectName = 'Test Project'
      const tenantId = 'tenant-123'

      const response = handleSyncResponse(result, projectId, projectName, tenantId)

      expect(response).toEqual({
        data: {
          data: result,
          message: 'Project synced successfully',
          projectId,
          projectName,
          tenantId,
        },
        error: null,
        success: true,
        timestamp: expect.any(String),
      })
    })

    it('should handle response without tenantId', () => {
      const result = { id: 'tenant-123', name: 'Test Tenant' }
      const projectId = 'project-123'
      const projectName = 'Test Project'

      const response = handleSyncResponse(result, projectId, projectName)

      expect(response).toEqual({
        data: {
          data: result,
          message: 'Project synced successfully',
          projectId,
          projectName,
          tenantId: undefined,
        },
        error: null,
        success: true,
        timestamp: expect.any(String),
      })
    })
  })
})
