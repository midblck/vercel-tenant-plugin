// ============================================================================
// CONSTANTS FOR VERCELL TENANT PLUGIN
// ============================================================================

// Sync Status Constants
export const SYNC_STATUSES = {
  COMPLETED: 'completed',
  ERROR: 'error',
  IDLE: 'idle',
  SYNCING: 'syncing',
} as const

// Progress Status Constants
export const PROGRESS_STATUSES = {
  ERROR: 'error',
  IDLE: 'idle',
  PROCESSING: 'processing',
  SUCCESS: 'success',
} as const

// Error Message Constants
export const ERROR_MESSAGES = {
  API_ERROR: 'Vercel API error - check your token',
  CONNECTION_FAILED: 'Failed to connect to server',
  DEPLOYMENT_SYNC_FAILED: 'Deployment sync failed',
  MISSING_PARAMS: 'Missing required parameters (tenantId or syncAll)',
  NETWORK_ERROR: 'Network connection error',
  PROJECT_SYNC_FAILED: 'Project sync failed',
  SYNC_FAILED: 'Failed to sync projects',
  VALIDATION_ERROR: 'Invalid request data',
} as const

// Success Message Constants
export const SUCCESS_MESSAGES = {
  DEPLOYMENT_SYNC_COMPLETED: '✅ Deployment sync completed successfully',
  PROJECT_SYNC_COMPLETED: '✅ Project sync completed successfully',
  SYNC_COMPLETED: '✅ Sync completed successfully',
} as const

// Progress Message Constants
export const PROGRESS_MESSAGES = {
  CANCELLING_DEPLOYMENTS: 'Cancelling deployments...',
  CREATING_DEPLOYMENT: 'Creating deployment...',
  STARTING_DEPLOYMENT: 'Starting deployment process...',
  STARTING_DEPLOYMENT_SYNC: 'Starting deployment sync...',
  STARTING_SYNC: '🔄 Starting sync process...',
  SYNCING_DEPLOYMENTS: 'Syncing deployments from Vercel...',
  SYNCING_PROJECTS: 'Syncing projects from Vercel...',
} as const

// Auto-refresh delay (in milliseconds)
export const AUTO_REFRESH_DELAY = 2000

// Progress bar colors
export const PROGRESS_COLORS = {
  COMPLETED: '#38a169',
  DEPLOYMENT: '#805ad5',
  ERROR: '#e53e3e',
  IDLE: '#6b7280',
  SYNCING: '#3182ce',
} as const

// Validation constants
export const VALIDATION = {
  MIN_TOKEN_LENGTH: 10,
  VALID_ENVIRONMENTS: ['production', 'preview', 'development'] as const,
} as const
