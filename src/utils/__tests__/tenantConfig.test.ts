import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { getConfig, getGlobalConfig, getTenantConfig } from '../tenantConfig'

// Mock Payload
const mockPayload = {
  findByID: vi.fn(),
  findGlobal: vi.fn(),
} as unknown as Payload

// Mock environment variables
const originalEnv = process.env

describe('TenantConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  describe('getGlobalConfig', () => {
    it('should return environment variables when no global settings exist', async () => {
      process.env.VERCEL_TOKEN = 'env-token'
      process.env.VERCEL_TEAM_ID = 'env-team'
      process.env.LOGGER_ENABLED = 'true'

      mockPayload.findGlobal.mockResolvedValue(null)

      const config = await getGlobalConfig(mockPayload)

      expect(config).toEqual({
        loggerEnabled: true,
        vercelTeamId: 'env-team',
        vercelToken: 'env-token',
      })
    })

    it('should return global settings when available', async () => {
      const globalSettings = {
        loggerEnabled: false,
        credentials: [
          {
            accountName: 'Account A',
            active: true,
            vercelTeamId: 'global-team',
            vercelToken: 'global-token',
          },
        ],
      }

      mockPayload.findGlobal.mockResolvedValue(globalSettings)

      const config = await getGlobalConfig(mockPayload)

      expect(config).toEqual({
        loggerEnabled: false,
        vercelTeamId: 'global-team',
        vercelToken: 'global-token',
      })
    })

    it('should fallback to environment when global settings are empty', async () => {
      process.env.VERCEL_TOKEN = 'env-token'
      process.env.VERCEL_TEAM_ID = 'env-team'
      process.env.LOGGER_ENABLED = 'true'

      const globalSettings = {
        loggerEnabled: false,
        credentials: [],
      }

      mockPayload.findGlobal.mockResolvedValue(globalSettings)

      const config = await getGlobalConfig(mockPayload)

      expect(config).toEqual({
        loggerEnabled: false, // Uses global setting, not env
        vercelTeamId: 'env-team',
        vercelToken: 'env-token',
      })
    })

    it('should pick the last active credential when multiple are set to active', async () => {
      const globalSettings = {
        credentials: [
          {
            accountName: 'Account A',
            active: false,
            vercelTeamId: 'team-a',
            vercelToken: 'token-a',
          },
          {
            accountName: 'Account B',
            active: true,
            vercelTeamId: 'team-b',
            vercelToken: 'token-b',
          },
          {
            accountName: 'Account C',
            active: true,
            vercelTeamId: 'team-c',
            vercelToken: 'token-c',
          },
        ],
        loggerEnabled: true,
      }

      mockPayload.findGlobal.mockResolvedValue(globalSettings)

      const config = await getGlobalConfig(mockPayload)

      expect(config).toEqual({
        loggerEnabled: true,
        vercelTeamId: 'team-c',
        vercelToken: 'token-c',
      })
    })
  })

  describe('getTenantConfig', () => {
    it('should return tenant overrides when available', async () => {
      const tenant = {
        id: 'tenant-1',
        vercelTeamIdOverride: 'tenant-team',
        vercelTokenOverride: 'tenant-token',
      }

      const globalSettings = {
        loggerEnabled: true,
        credentials: [
          {
            accountName: 'Account A',
            active: true,
            vercelTeamId: 'global-team',
            vercelToken: 'global-token',
          },
        ],
      }

      mockPayload.findByID.mockResolvedValue(tenant)
      mockPayload.findGlobal.mockResolvedValue(globalSettings)

      const config = await getTenantConfig('tenant-1', mockPayload)

      expect(config).toEqual({
        loggerEnabled: true, // Global only
        vercelTeamId: 'tenant-team',
        vercelToken: 'tenant-token',
      })
    })

    it('should fallback to global settings when tenant overrides are empty', async () => {
      const tenant = {
        id: 'tenant-1',
        vercelTeamIdOverride: '',
        vercelTokenOverride: '',
      }

      const globalSettings = {
        loggerEnabled: false,
        credentials: [
          {
            accountName: 'Account A',
            active: true,
            vercelTeamId: 'global-team',
            vercelToken: 'global-token',
          },
        ],
      }

      mockPayload.findByID.mockResolvedValue(tenant)
      mockPayload.findGlobal.mockResolvedValue(globalSettings)

      const config = await getTenantConfig('tenant-1', mockPayload)

      expect(config).toEqual({
        loggerEnabled: false,
        vercelTeamId: 'global-team',
        vercelToken: 'global-token',
      })
    })

    it('should fallback to global config when tenant not found', async () => {
      mockPayload.findByID.mockRejectedValue(new Error('Tenant not found'))
      mockPayload.findGlobal.mockResolvedValue(null)

      process.env.VERCEL_TOKEN = 'env-token'
      process.env.VERCEL_TEAM_ID = 'env-team'
      process.env.LOGGER_ENABLED = 'true'

      const config = await getTenantConfig('nonexistent-tenant', mockPayload)

      expect(config).toEqual({
        loggerEnabled: true,
        vercelTeamId: 'env-team',
        vercelToken: 'env-token',
      })
    })
  })

  describe('getConfig', () => {
    it('should call getTenantConfig when tenantId is provided', async () => {
      const tenant = {
        id: 'tenant-1',
        vercelTeamIdOverride: 'tenant-team',
        vercelTokenOverride: 'tenant-token',
      }

      const globalSettings = {
        loggerEnabled: true,
        credentials: [
          {
            accountName: 'Account A',
            active: true,
            vercelTeamId: 'global-team',
            vercelToken: 'global-token',
          },
        ],
      }

      mockPayload.findByID.mockResolvedValue(tenant)
      mockPayload.findGlobal.mockResolvedValue(globalSettings)

      const config = await getConfig(mockPayload, 'tenant-1')

      expect(config).toEqual({
        loggerEnabled: true,
        vercelTeamId: 'tenant-team',
        vercelToken: 'tenant-token',
      })
    })

    it('should call getGlobalConfig when no tenantId is provided', async () => {
      const globalSettings = {
        loggerEnabled: false,
        credentials: [
          {
            accountName: 'Account A',
            active: true,
            vercelTeamId: 'global-team',
            vercelToken: 'global-token',
          },
        ],
      }

      mockPayload.findGlobal.mockResolvedValue(globalSettings)

      const config = await getConfig(mockPayload)

      expect(config).toEqual({
        loggerEnabled: false,
        vercelTeamId: 'global-team',
        vercelToken: 'global-token',
      })
    })
  })
})
