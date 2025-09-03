// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export interface EnvironmentConfig {
  // Application Configuration
  app: {
    authSecret: string
    authUrl: string
    cronSecret: string
    previewSecret: string
    secret: string
    serverUrl: string
  }

  // Database Configuration
  database: {
    name: string
    uri: string
  }

  // OAuth Configuration
  oauth: {
    google: {
      clientId: string
      clientSecret: string
    }
  }

  // SMTP Configuration
  smtp: {
    host: string
    password: string
    port: number
    secure: boolean
    username: string
  }

  // Vercel Configuration
  vercel: {
    teamId?: string
    token: string
  }
}

// Default values for development (can be overridden by environment variables)
const DEFAULT_VALUES = {
  app: {
    authSecret: 'dev-auth-secret-change-in-production',
    authUrl: '', // Will be populated by tenant environment variables
    cronSecret: 'dev-cron-secret-change-in-production',
    previewSecret: 'dev-preview-secret-change-in-production',
    secret: 'dev-secret-key-change-in-production',
    serverUrl: '', // Will be populated by tenant environment variables
  },
  database: {
    name: 'vercel-tenant-plugin',
    uri: 'mongodb://localhost:27017/vercel-tenant-plugin',
  },
  oauth: {
    google: {
      clientId: '',
      clientSecret: '',
    },
  },
  smtp: {
    host: 'smtp.gmail.com',
    password: 'dev-password',
    port: 587,
    secure: false,
    username: 'dev@example.com',
  },
} as const

// Environment variable getters with fallbacks
const getEnvVar = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue
}

const getEnvVarNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key]
  return value ? parseInt(value, 10) : defaultValue
}

const getEnvVarBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key]
  if (value === undefined) {
    return defaultValue
  }
  return value.toLowerCase() === 'true'
}

// Build configuration from environment variables
export const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    app: {
      authSecret: getEnvVar('PAYLOAD_AUTH_SECRET', DEFAULT_VALUES.app.authSecret),
      authUrl: getEnvVar('NEXT_PUBLIC_PAYLOAD_AUTH_URL', DEFAULT_VALUES.app.authUrl),
      cronSecret: getEnvVar('CRON_SECRET', DEFAULT_VALUES.app.cronSecret),
      previewSecret: getEnvVar('PREVIEW_SECRET', DEFAULT_VALUES.app.previewSecret),
      secret: getEnvVar('PAYLOAD_SECRET', DEFAULT_VALUES.app.secret),
      serverUrl: getEnvVar('NEXT_PUBLIC_SERVER_URL', DEFAULT_VALUES.app.serverUrl),
    },
    database: {
      name: getEnvVar('DATABASE_NAME', DEFAULT_VALUES.database.name),
      uri: getEnvVar('DATABASE_URI', DEFAULT_VALUES.database.uri),
    },
    oauth: {
      google: {
        clientId: getEnvVar('GOOGLE_CLIENT_ID', DEFAULT_VALUES.oauth.google.clientId),
        clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET', DEFAULT_VALUES.oauth.google.clientSecret),
      },
    },
    smtp: {
      host: getEnvVar('SMTP_HOST', DEFAULT_VALUES.smtp.host),
      password: getEnvVar('SMTP_PASS', DEFAULT_VALUES.smtp.password),
      port: getEnvVarNumber('SMTP_PORT', DEFAULT_VALUES.smtp.port),
      secure: getEnvVarBoolean('SMTP_SECURE', DEFAULT_VALUES.smtp.secure),
      username: getEnvVar('SMTP_USER', DEFAULT_VALUES.smtp.username),
    },
    vercel: {
      teamId: getEnvVar('VERCEL_TEAM_ID', ''),
      token: getEnvVar('VERCEL_TOKEN', ''),
    },
  }
}

// Validation function
export const validateEnvironmentConfig = (config: EnvironmentConfig): string[] => {
  const errors: string[] = []

  if (!config.vercel.token) {
    errors.push('VERCEL_TOKEN is required')
  }

  if (!config.database.uri) {
    errors.push('DATABASE_URI is required')
  }

  if (!config.app.secret || config.app.secret === DEFAULT_VALUES.app.secret) {
    errors.push('PAYLOAD_SECRET should be set to a secure value in production')
  }

  if (!config.app.authSecret || config.app.authSecret === DEFAULT_VALUES.app.authSecret) {
    errors.push('PAYLOAD_AUTH_SECRET should be set to a secure value in production')
  }

  return errors
}

// Export default values for use in collections
export { DEFAULT_VALUES }
