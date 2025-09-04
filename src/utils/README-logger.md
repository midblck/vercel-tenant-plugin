# Tenant-Aware Logger

The logger has been updated to be aware of tenant settings stored in the database. It will check the `tenant-setting` global collection for the `loggerEnabled` setting before logging.

## How It Works

1. **Tenant Settings Priority**: If `loggerEnabled` is explicitly set in tenant settings (true or false), it overrides environment variables
2. **Environment Fallback**: If tenant settings are not available or `loggerEnabled` is undefined, it falls back to environment variables
3. **Caching**: Tenant settings are cached for 30 seconds to avoid repeated database calls

## Usage in Endpoints

### Option 1: Use the Tenant-Aware Logger Wrapper (Recommended)

```typescript
import { createTenantAwareLogger } from '../utils/loggerInit'

export const myEndpoint: PayloadHandler = async (req) => {
  // Create tenant-aware logger
  const logger = createTenantAwareLogger(req.payload)

  // Use logger normally - it will respect tenant settings
  logger.info('This will check tenant settings before logging')
  logger.tenant('Tenant operation')
  logger.deployment('Deployment sync')
}
```

### Option 2: Initialize Manually

```typescript
import { logger, initializeWithTenantSettings } from '../utils/logger'

export const myEndpoint: PayloadHandler = async (req) => {
  // Initialize logger with tenant settings
  await initializeWithTenantSettings(req.payload)

  // Use logger normally - it will respect tenant settings
  await logger.info('This will check tenant settings before logging')
  await logger.tenant('Tenant operation')
  await logger.deployment('Deployment sync')
}
```

## Debugging

To check the current logger state:

```typescript
import { getLoggerState } from '../utils/logger'

const state = getLoggerState()
console.log('Logger state:', state)
```

This will show:

- `isEnabled`: Current enabled state
- `isDevelopment`: Whether in development mode
- `hasPayload`: Whether Payload instance is set
- `cacheState`: Current cache state
- `envLoggerEnabled`: Environment variable value

## Settings Priority

1. **Tenant Setting = false**: Logger disabled (overrides env)
2. **Tenant Setting = true**: Logger enabled (overrides env)
3. **Tenant Setting = null/undefined**: Falls back to environment variables
4. **Environment Variable = "true"**: Logger enabled
5. **Environment Variable = "false"**: Logger disabled
6. **Environment Variable = undefined + Development**: Logger enabled
7. **Environment Variable = undefined + Production**: Logger disabled

## Migration

To migrate existing endpoints:

1. Replace `import { logger } from '../utils/logger'` with `import { createTenantAwareLogger } from '../utils/loggerInit'`
2. Add `const logger = createTenantAwareLogger(req.payload)` at the beginning of your endpoint
3. Use the logger normally - no other changes needed
