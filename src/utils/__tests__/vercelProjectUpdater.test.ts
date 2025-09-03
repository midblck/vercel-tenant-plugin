// ============================================================================
// VERCEL PROJECT UPDATER TESTS
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildProjectUpdateRequest,
  executeProjectUpdate,
  handleProjectUpdateResponse,
  logFilteredFields,
  validateProjectUpdateData,
} from '../vercelProjectUpdater'

// Mock fetch for testing
global.fetch = vi.fn()

describe('VercelProjectUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateProjectUpdateData', () => {
    it('should validate valid tenant data', () => {
      const validData = { id: 'test-id', name: 'Test Project' }
      expect(() => validateProjectUpdateData(validData)).not.toThrow()
    })

    it('should throw error for null data', () => {
      expect(() => validateProjectUpdateData(null)).toThrow('Invalid tenant data provided')
    })

    it('should throw error for undefined data', () => {
      expect(() => validateProjectUpdateData(undefined)).toThrow('Invalid tenant data provided')
    })

    it('should throw error for non-object data', () => {
      expect(() => validateProjectUpdateData('invalid')).toThrow('Invalid tenant data provided')
    })

    it('should throw error for missing tenant ID', () => {
      const invalidData = { name: 'Test Project' }
      expect(() => validateProjectUpdateData(invalidData)).toThrow(
        'Tenant ID is required for project updates',
      )
    })
  })

  describe('buildProjectUpdateRequest', () => {
    it('should build request with all available fields', () => {
      const tenantData = {
        id: 'test-id',
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        outputDirectory: 'dist',
        rootDirectory: 'src',
        directoryListing: true,
        publicSource: false,
        autoAssignCustomDomains: true,
        autoExposeSystemEnvs: false,
        trustedIps: ['192.168.1.1'],
      }

      const result = buildProjectUpdateRequest(tenantData)

      expect(result).toEqual({
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        outputDirectory: 'dist',
        rootDirectory: 'src',
        directoryListing: true,
        publicSource: false,
        autoAssignCustomDomains: true,
        autoExposeSystemEnvs: false,
        trustedIps: ['192.168.1.1'],
      })
    })

    it('should build request with only defined fields', () => {
      const tenantData = {
        id: 'test-id',
        buildCommand: 'npm run build',
        // Other fields undefined
      }

      const result = buildProjectUpdateRequest(tenantData)

      expect(result).toEqual({
        buildCommand: 'npm run build',
      })
    })

    it('should handle empty tenant data', () => {
      const tenantData = { id: 'test-id' }
      const result = buildProjectUpdateRequest(tenantData)
      expect(result).toEqual({})
    })
  })

  describe('executeProjectUpdate', () => {
    it('should successfully execute project update', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'project-123', name: 'Test Project' }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await executeProjectUpdate(
        'https://api.vercel.com/v9/projects/test',
        { buildCommand: 'npm run build' },
        'test-token',
      )

      expect(result).toEqual({ id: 'project-123', name: 'Test Project' })
      expect(global.fetch).toHaveBeenCalledWith('https://api.vercel.com/v9/projects/test', {
        body: JSON.stringify({ buildCommand: 'npm run build' }),
        headers: {
          Accept: '*/*',
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json; charset=utf-8',
        },
        method: 'PATCH',
      })
    })

    it('should throw error for failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Invalid request'),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await expect(
        executeProjectUpdate(
          'https://api.vercel.com/v9/projects/test',
          { buildCommand: 'npm run build' },
          'test-token',
        ),
      ).rejects.toThrow('HTTP 400: Invalid request')
    })
  })

  describe('handleProjectUpdateResponse', () => {
    it('should handle successful response', () => {
      const result = { id: 'project-123', name: 'Test Project' }
      const projectId = 'project-123'
      const tenantData = { id: 'tenant-123', name: 'Test Tenant' }
      const requestBody = { buildCommand: 'npm run build' }

      const response = handleProjectUpdateResponse(result, projectId, tenantData, requestBody)

      expect(response).toEqual({
        data: result,
        error: null,
        success: true,
        timestamp: expect.any(String),
      })
    })
  })

  describe('logFilteredFields', () => {
    it('should log filtered fields without throwing', () => {
      const tenantData = {
        id: 'test-id',
        analytics: { enabled: true },
        live: true,
        features: { v0: true },
      }
      const projectId = 'project-123'
      const requestBody = { buildCommand: 'npm run build' }

      // Should not throw
      expect(() => logFilteredFields(tenantData, projectId, requestBody)).not.toThrow()
    })
  })
})
