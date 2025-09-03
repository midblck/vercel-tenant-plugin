// ============================================================================
// VERCEL ENDPOINTS - RE-EXPORTS
// ============================================================================

// Export types for use in other parts of the application
export type * from '../types'
export { cancelDeployments } from './cancelDeployments'
export { createDeployment } from './createDeployment'
export { createEnvironmentVariables } from './createEnvironmentVariables'
export { createNewTenant } from './createTenant'
export { deleteDeployment } from './deleteDeployment'
export { listProjects } from './listProjects'
export { syncDeployments } from './syncDeployments'
export { syncEnvironmentVariables } from './syncEnvironmentVariables'
export { syncProjects } from './syncProjects'

export { syncSingleProject } from './syncSingleProject'
export { tenantCountsHandler } from './tenantCounts'
export { tenantDeploymentCountsHandler } from './tenantDeploymentCounts'

export { updateEnvironmentVariable } from './updateEnvironmentVariable'

// Also export core functions for use in collections
export { createVercelProject, deleteVercelProject, updateVercelProject } from './vercelClient'
