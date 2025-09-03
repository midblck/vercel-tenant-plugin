// ============================================================================
// VERCEL DATA MAPPER TESTS
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
  createNewTenantData,
  mapBasicProjectInfo,
  mapBuildConfiguration,
  mapCompleteVercelData,
  mapCronJobs,
  // mapDeploymentSettings, // Unused import
  mapDomains,
  mapGitRepository,
  mapProjectSettings,
  mapVercelDataToTenant,
} from '../vercelDataMapper'
import type { EnhancedVercelDomain, EnhancedVercelProject } from '../../types'

describe('VercelDataMapper', () => {
  const mockProject: EnhancedVercelProject = {
    id: 'project-123',
    name: 'Test Project',
    buildCommand: 'npm run build',
    createdAt: 1640995200000, // 2022-01-01
    crons: {
      definitions: [
        {
          host: 'example.com',
          path: '/api/cron',
          schedule: '0 0 * * *',
        },
      ],
      deploymentId: 'deploy-123',
      disabledAt: null,
      enabledAt: 1640995200000,
      updatedAt: 1640995200000,
    },
    devCommand: 'npm run dev',
    directoryListing: true,
    environment: 'production',
    features: { v0: true },
    framework: 'nextjs',
    installCommand: 'npm install',
    link: {
      type: 'github',
      branch: 'main',
      owner: 'test-owner',
      productionBranch: 'main',
      repo: 'test-repo',
      repoId: 123,
      repoOwnerId: 456,
    },
    live: true,
    nodeVersion: '18.x',
    outputDirectory: 'dist',
    paused: false,
    publicSource: false,
    rootDirectory: 'src',
    tier: 'pro',
    updatedAt: 1640995200000,
    url: 'https://test-project.vercel.app',
    v0: true,
  }

  const mockDomains: EnhancedVercelDomain[] = [
    {
      name: 'example.com',
      apexName: 'example.com',
      createdAt: 1640995200000,
      projectId: 'project-123',
      updatedAt: 1640995200000,
      verified: true,
    },
    {
      name: 'www.example.com',
      apexName: 'example.com',
      createdAt: 1640995200000,
      projectId: 'project-123',
      updatedAt: 1640995200000,
      verified: false,
    },
  ]

  describe('mapBasicProjectInfo', () => {
    it('should map basic project information', () => {
      const result = mapBasicProjectInfo(mockProject, 'READY')

      expect(result).toEqual({
        vercelProjectCreatedAt: '2022-01-01T00:00:00.000Z',
        vercelProjectEnvironment: 'production',
        vercelProjectFramework: 'nextjs',
        vercelProjectStatus: 'READY',
        vercelProjectUpdatedAt: '2022-01-01T00:00:00.000Z',
      })
    })

    it('should use default status when not provided', () => {
      const result = mapBasicProjectInfo(mockProject)

      expect(result.vercelProjectStatus).toBe('unknown')
    })
  })

  describe('mapBuildConfiguration', () => {
    it('should map build configuration', () => {
      const result = mapBuildConfiguration(mockProject)

      expect(result).toEqual({
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        nodeVersion: '18.x',
        outputDirectory: 'dist',
        rootDirectory: 'src',
      })
    })

    it('should handle missing build configuration', () => {
      const projectWithoutBuild = { ...mockProject }
      delete projectWithoutBuild.buildCommand
      delete projectWithoutBuild.devCommand

      const result = mapBuildConfiguration(projectWithoutBuild)

      expect(result).toEqual({
        buildCommand: null,
        devCommand: null,
        installCommand: 'npm install',
        nodeVersion: '18.x',
        outputDirectory: 'dist',
        rootDirectory: 'src',
      })
    })
  })

  describe('mapProjectSettings', () => {
    it('should map project settings', () => {
      const result = mapProjectSettings(mockProject)

      expect(result).toEqual({
        directoryListing: true,
        features: { v0: true },
        live: true,
        paused: false,
        publicSource: false,
        tier: 'pro',
        v0: true,
      })
    })
  })

  describe('mapGitRepository', () => {
    it('should map git repository information', () => {
      const result = mapGitRepository(mockProject)

      expect(result.vercelProjectGitRepository).toEqual({
        type: 'github',
        branch: 'main',
        createdAt: null,
        deployHooks: [],
        gitCredentialId: undefined,
        owner: 'test-owner',
        repo: 'test-repo',
        repoId: 123,
        repoOwnerId: 456,
        updatedAt: null,
      })
    })

    it('should handle missing git repository', () => {
      const projectWithoutGit = { ...mockProject, link: undefined }
      const result = mapGitRepository(projectWithoutGit)

      expect(result.vercelProjectGitRepository).toBeNull()
    })
  })

  describe('mapCronJobs', () => {
    it('should map cron jobs information', () => {
      const result = mapCronJobs(mockProject)

      expect(result.vercelProjectCrons).toEqual({
        definitions: [
          {
            host: 'example.com',
            path: '/api/cron',
            schedule: '0 0 * * *',
          },
        ],
        deploymentId: 'deploy-123',
        disabledAt: null,
        enabledAt: '2022-01-01T00:00:00.000Z',
        updatedAt: '2022-01-01T00:00:00.000Z',
      })
    })

    it('should handle missing cron jobs', () => {
      const projectWithoutCrons = { ...mockProject, crons: undefined }
      const result = mapCronJobs(projectWithoutCrons)

      expect(result.vercelProjectCrons).toBeNull()
    })
  })

  describe('mapDomains', () => {
    it('should map domains and project URL', () => {
      const result = mapDomains(mockDomains, mockProject)

      expect(result.vercelProjectDomains).toEqual([
        { domain: 'example.com', verified: true },
        { domain: 'www.example.com', verified: false },
      ])

      // Should use first verified domain
      expect(result.vercelProjectUrl).toBe('https://example.com')
    })

    it('should fallback to project URL when no domains', () => {
      const result = mapDomains([], mockProject)

      expect(result.vercelProjectDomains).toEqual([])
      expect(result.vercelProjectUrl).toBe('https://test-project.vercel.app')
    })

    it('should fallback to default vercel.app URL', () => {
      const projectWithoutUrl = { ...mockProject, url: undefined }
      const result = mapDomains([], projectWithoutUrl)

      expect(result.vercelProjectUrl).toBe('https://Test Project.vercel.app')
    })
  })

  describe('mapCompleteVercelData', () => {
    it('should map complete Vercel data for reference', () => {
      const result = mapCompleteVercelData(mockProject, mockDomains, 'READY')

      expect(result.lastSyncData).toMatchObject({
        buildCommand: 'npm run build',
        createdAt: 1640995200000,
        devCommand: 'npm run dev',
        domains: [
          {
            name: 'example.com',
            apexName: 'example.com',
            createdAt: 1640995200000,
            projectId: 'project-123',
            updatedAt: 1640995200000,
            verified: true,
          },
          {
            name: 'www.example.com',
            apexName: 'example.com',
            createdAt: 1640995200000,
            projectId: 'project-123',
            updatedAt: 1640995200000,
            verified: false,
          },
        ],
        environment: 'production',
        framework: 'nextjs',
        installCommand: 'npm install',
        nodeVersion: '18.x',
        outputDirectory: 'dist',
        projectId: 'project-123',
        projectName: 'Test Project',
        rootDirectory: 'src',
        status: 'READY',
        syncedAt: expect.any(String),
        updatedAt: 1640995200000,
      })
    })
  })

  describe('mapVercelDataToTenant', () => {
    it('should map complete Vercel data to tenant format', () => {
      const result = mapVercelDataToTenant(mockProject, mockDomains, 'READY')

      // Should include all mapped data
      expect(result).toMatchObject({
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        directoryListing: true,
        installCommand: 'npm install',
        lastSyncData: expect.any(Object),
        live: true,
        nodeVersion: '18.x',
        outputDirectory: 'dist',
        paused: false,
        publicSource: false,
        rootDirectory: 'src',
        tier: 'pro',
        v0: true,
        vercelProjectCreatedAt: '2022-01-01T00:00:00.000Z',
        vercelProjectDomains: [
          { domain: 'example.com', verified: true },
          { domain: 'www.example.com', verified: false },
        ],
        vercelProjectEnvironment: 'production',
        vercelProjectFramework: 'nextjs',
        vercelProjectStatus: 'READY',
        vercelProjectUpdatedAt: '2022-01-01T00:00:00.000Z',
        vercelProjectUrl: 'https://example.com',
      })
    })
  })

  describe('createNewTenantData', () => {
    it('should create new tenant data with Vercel mapping', () => {
      const result = createNewTenantData(mockProject, mockDomains, 'team-123')

      expect(result).toMatchObject({
        name: 'Test Project',
        _syncOrigin: 'vercel-sync',
        isActive: true,
        lastSynced: expect.any(String),
        lastSyncMessage: '✅ New tenant created from Vercel project',
        lastSyncStatus: 'synced',
        status: 'approved',
        vercelProjectId: 'project-123', // CRITICAL: This prevents hook from creating duplicate Vercel projects
        vercelTeamId: 'team-123',
        // Should include all mapped Vercel data
        vercelProjectCreatedAt: '2022-01-01T00:00:00.000Z',
        vercelProjectEnvironment: 'production',
        vercelProjectFramework: 'nextjs',
        vercelProjectStatus: 'unknown',
      })
    })

    it('should handle missing project name', () => {
      const projectWithoutName = { ...mockProject, name: undefined }
      const result = createNewTenantData(projectWithoutName, mockDomains)

      expect(result.name).toBe('Project project-123')
      expect(result.vercelProjectId).toBe('project-123') // Should still set vercelProjectId
    })
  })
})
