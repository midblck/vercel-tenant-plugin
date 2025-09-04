// ============================================================================
// LOGGER INITIALIZATION HELPER
// ============================================================================

import type { Payload } from 'payload'
import { initializeWithTenantSettings, type LogContext, logger } from './logger'

/**
 * Initialize logger with tenant settings if not already initialized
 * This should be called at the beginning of each endpoint
 */
export async function initLoggerWithTenantSettings(payload: Payload): Promise<void> {
  try {
    // Only initialize if we don't have a payload instance yet
    const state = logger.getLoggerState()
    if (!state.hasPayload) {
      await initializeWithTenantSettings(payload)
    }
  } catch (error) {
    // Silently fail - logger will fall back to environment variables
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize logger with tenant settings:', error)
  }
}

/**
 * Initialize logger and log a debug message showing the current state
 * Useful for debugging logger behavior
 */
export async function initLoggerWithDebug(payload: Payload, context?: string): Promise<void> {
  await initializeWithTenantSettings(payload)

  const state = logger.getLoggerState()
  await logger.debug(`Logger initialized${context ? ` for ${context}` : ''}`, {
    loggerState: state,
    tenantSettingsRespected: state.hasPayload,
  })
}

/**
 * Create a logger wrapper that automatically initializes with tenant settings
 * This allows existing code to work without major changes
 */
export function createTenantAwareLogger(payload: Payload) {
  // Initialize logger with tenant settings (fire and forget)
  void initLoggerWithTenantSettings(payload).catch((error) => {
    // Silently fail - logger will fall back to environment variables
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize tenant-aware logger:', error)
  })

  // Return a wrapper that uses the global logger
  return {
    debug: (message: string, context?: LogContext) => void logger.debug(message, context),
    deployment: (message: string, context?: LogContext) => void logger.deployment(message, context),
    envVars: (message: string, context?: LogContext) => void logger.envVars(message, context),
    error: (message: string, context?: LogContext, error?: Error) =>
      void logger.error(message, context, error),
    info: (message: string, context?: LogContext) => void logger.info(message, context),
    payloadError: (message: string, context?: LogContext, error?: Error) =>
      void logger.payloadError(message, context, error),
    sync: (message: string, context?: LogContext) => void logger.sync(message, context),
    tenant: (message: string, context?: LogContext) => void logger.tenant(message, context),
    vercel: (message: string, context?: LogContext) => void logger.vercel(message, context),
    warn: (message: string, context?: LogContext) => void logger.warn(message, context),
  }
}
