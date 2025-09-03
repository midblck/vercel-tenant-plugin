import type { CollectionSlug, Config } from 'payload'

import { tenantCollection, tenantEnvironmentVariableCollection } from './collections'
import { tenantDeployment } from './collections/tenantDeployment'
import {
  cancelDeployments,
  createDeployment,
  createEnvironmentVariables,
  createNewTenant,
  listProjects,
  syncDeployments,
  syncEnvironmentVariables,
  syncProjects,
  syncSingleProject,
  tenantCountsHandler,
  tenantDeploymentCountsHandler,
  updateEnvironmentVariable,
} from './endpoints/index'
// generateProjectUrl function removed for data reliability
import { getEnvironmentConfig, validateEnvironmentConfig } from './config/environment'

// Export collections for direct import
export { tenantCollection, tenantDeployment, tenantEnvironmentVariableCollection }

// Export endpoint handlers for direct import
export { createEnvironmentVariables, createNewTenant, listProjects, syncDeployments, syncProjects }

// Export components for admin interface
// SyncButton component not found - removed from exports
// Export strategy classes for Vercel ID updates
export { SimpleUpdateStrategy } from './endpoints/createEnvironmentVariables'

export type { EnvVarUpdateStrategy } from './endpoints/createEnvironmentVariables'

// Export types
// VercelIdUpdateStrategy removed - not needed

// Export utility functions
// generateProjectUrl function removed for data reliability

export type VercelTenantPluginConfig = {
  /**
   * List of collections to add relationship fields to
   */
  collections?: Partial<Record<CollectionSlug, true>>
  /**
   * Disable the plugin
   */
  disabled?: boolean
  /**
   * Optional Vercel team ID
   */
  teamId?: string
  /**
   * Vercel API token for authentication
   */
  vercelToken: string
}

export const vercelTenantPlugin =
  (pluginOptions: VercelTenantPluginConfig) =>
  (config: Config): Config => {
    // Validate environment configuration
    const envConfig = getEnvironmentConfig()
    const envErrors = validateEnvironmentConfig(envConfig)

    if (envErrors.length > 0) {
      // Environment configuration issues detected - these should be logged through proper logging system
      // For now, these are non-critical warnings that don't prevent plugin operation
    }

    if (!config.collections) {
      config.collections = []
    }

    // Add our tenant collections
    config.collections.push(tenantCollection)
    config.collections.push(tenantEnvironmentVariableCollection)
    config.collections.push(tenantDeployment)

    // Add relationship fields to specified collections
    if (pluginOptions.collections) {
      for (const collectionSlug in pluginOptions.collections) {
        const collection = config.collections.find(
          (collection) => collection.slug === collectionSlug,
        )

        if (collection) {
          collection.fields.push({
            name: 'vercelTenant',
            type: 'relationship',
            admin: {
              description: 'Associated Vercel tenant project',
              position: 'sidebar',
            },
            relationTo: 'tenant',
          })
        }
      }
    }

    /**
     * If the plugin is disabled, we still want to keep added collections/fields so the database schema is consistent which is important for migrations.
     * If your plugin heavily modifies the database schema, you may want to remove this property.
     */
    if (pluginOptions.disabled) {
      return config
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    // Add our custom endpoints
    config.endpoints.push({
      handler: syncDeployments,
      method: 'post',
      path: '/vercel/sync-deployments',
    })

    config.endpoints.push({
      handler: syncEnvironmentVariables,
      method: 'post',
      path: '/vercel/sync-environment-variables',
    })

    config.endpoints.push({
      handler: createDeployment,
      method: 'post',
      path: '/vercel/create-deployment',
    })

    config.endpoints.push({
      handler: cancelDeployments,
      method: 'post',
      path: '/vercel/cancel-deployments',
    })

    if (!config.admin) {
      config.admin = {}
    }

    if (!config.admin.components) {
      config.admin.components = {}
    }

    if (!config.admin.components.beforeDashboard) {
      config.admin.components.beforeDashboard = []
    }

    // Register custom field components
    // Type assertion needed as fields property is not in Payload's TypeScript definitions yet
    const adminComponents = config.admin.components as {
      fields?: Record<string, unknown>
    } & Record<string, unknown>
    if (!adminComponents.fields) {
      adminComponents.fields = {}
    }

    // Register SyncButton component for UI fields
    adminComponents.fields.SyncButton = '@midblck/vercel-tenant-plugin/client#SyncButton'

    config.admin.components.beforeDashboard.push(
      `@midblck/vercel-tenant-plugin/client#BeforeDashboardClient`,
    )
    // BeforeDashboardServer component removed - functionality integrated into BeforeDashboardClient

    // Add Vercel API endpoints
    config.endpoints.push({
      handler: listProjects,
      method: 'post',
      path: '/vercel/projects',
    })

    config.endpoints.push({
      handler: syncProjects,
      method: 'post',
      path: '/vercel/sync',
    })

    config.endpoints.push({
      handler: syncSingleProject,
      method: 'post',
      path: '/sync-single-project',
    })

    config.endpoints.push({
      handler: createNewTenant,
      method: 'post',
      path: '/vercel/create-tenant',
    })

    config.endpoints.push({
      handler: createEnvironmentVariables,
      method: 'post',
      path: '/vercel/create-environment-variables',
    })

    config.endpoints.push({
      handler: updateEnvironmentVariable,
      method: 'patch',
      path: '/vercel/update-environment-variable',
    })

    config.endpoints.push({
      handler: tenantCountsHandler,
      method: 'get',
      path: '/vercel/tenant-counts',
    })

    config.endpoints.push({
      handler: tenantDeploymentCountsHandler,
      method: 'get',
      path: '/vercel/tenant-deployment-counts',
    })

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Ensure we are executing any existing onInit functions before running our own.
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      // Vercel client is created on-demand in endpoints
    }

    return config
  }
