// ============================================================================
// VERCEL ENHANCED TYPES TESTS
// ============================================================================

import {
  isEnhancedVercelDomain,
  isEnhancedVercelGitLink,
  isEnhancedVercelProject,
} from '../vercelEnhanced'

describe('VercelEnhanced Type Guards', () => {
  describe('isEnhancedVercelProject', () => {
    it('should return true for valid Vercel project', () => {
      const validProject = {
        id: 'project-123',
        name: 'Test Project',
        createdAt: 1640995200000,
        updatedAt: 1640995200000,
      }

      expect(isEnhancedVercelProject(validProject)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isEnhancedVercelProject(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isEnhancedVercelProject(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isEnhancedVercelProject('invalid')).toBe(false)
    })

    it('should return false for object without id', () => {
      const invalidProject = {
        name: 'Test Project',
        createdAt: 1640995200000,
        updatedAt: 1640995200000,
      }

      expect(isEnhancedVercelProject(invalidProject)).toBe(false)
    })

    it('should return false for object without name', () => {
      const invalidProject = {
        id: 'project-123',
        createdAt: 1640995200000,
        updatedAt: 1640995200000,
      }

      expect(isEnhancedVercelProject(invalidProject)).toBe(false)
    })

    it('should return false for object with non-string id', () => {
      const invalidProject = {
        id: 123,
        name: 'Test Project',
        createdAt: 1640995200000,
        updatedAt: 1640995200000,
      }

      expect(isEnhancedVercelProject(invalidProject)).toBe(false)
    })

    it('should return false for object with non-string name', () => {
      const invalidProject = {
        id: 'project-123',
        name: 123,
        createdAt: 1640995200000,
        updatedAt: 1640995200000,
      }

      expect(isEnhancedVercelProject(invalidProject)).toBe(false)
    })
  })

  describe('isEnhancedVercelDomain', () => {
    it('should return true for valid Vercel domain', () => {
      const validDomain = {
        name: 'example.com',
        verified: true,
        apexName: 'example.com',
        createdAt: 1640995200000,
        projectId: 'project-123',
        updatedAt: 1640995200000,
      }

      expect(isEnhancedVercelDomain(validDomain)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isEnhancedVercelDomain(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isEnhancedVercelDomain(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isEnhancedVercelDomain('invalid')).toBe(false)
    })

    it('should return false for object without name', () => {
      const invalidDomain = {
        verified: true,
        apexName: 'example.com',
      }

      expect(isEnhancedVercelDomain(invalidDomain)).toBe(false)
    })

    it('should return false for object without verified', () => {
      const invalidDomain = {
        name: 'example.com',
        apexName: 'example.com',
      }

      expect(isEnhancedVercelDomain(invalidDomain)).toBe(false)
    })

    it('should return false for object with non-string name', () => {
      const invalidDomain = {
        name: 123,
        verified: true,
      }

      expect(isEnhancedVercelDomain(invalidDomain)).toBe(false)
    })

    it('should return false for object with non-boolean verified', () => {
      const invalidDomain = {
        name: 'example.com',
        verified: 'true',
      }

      expect(isEnhancedVercelDomain(invalidDomain)).toBe(false)
    })
  })

  describe('isEnhancedVercelGitLink', () => {
    it('should return true for valid Vercel git link', () => {
      const validGitLink = {
        type: 'github',
        repo: 'test-repo',
        branch: 'main',
        owner: 'test-owner',
        productionBranch: 'main',
        repoId: 123,
        repoOwnerId: 456,
      }

      expect(isEnhancedVercelGitLink(validGitLink)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isEnhancedVercelGitLink(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isEnhancedVercelGitLink(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isEnhancedVercelGitLink('invalid')).toBe(false)
    })

    it('should return false for object without type', () => {
      const invalidGitLink = {
        repo: 'test-repo',
        branch: 'main',
        owner: 'test-owner',
      }

      expect(isEnhancedVercelGitLink(invalidGitLink)).toBe(false)
    })

    it('should return false for object without repo', () => {
      const invalidGitLink = {
        type: 'github',
        branch: 'main',
        owner: 'test-owner',
      }

      expect(isEnhancedVercelGitLink(invalidGitLink)).toBe(false)
    })

    it('should return false for object with non-string type', () => {
      const invalidGitLink = {
        type: 123,
        repo: 'test-repo',
      }

      expect(isEnhancedVercelGitLink(invalidGitLink)).toBe(false)
    })

    it('should return false for object with non-string repo', () => {
      const invalidGitLink = {
        type: 'github',
        repo: 123,
      }

      expect(isEnhancedVercelGitLink(invalidGitLink)).toBe(false)
    })
  })
})
