/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// LOGGING SYSTEM WITH ENABLE/DISABLE FUNCTIONALITY AND TENANT AWARENESS
// ============================================================================

import type { Payload } from 'payload'

export enum LogLevel {
  DEBUG = 'debug',
  ERROR = 'error',
  INFO = 'info',
  WARN = 'warn',
}

export interface LogContext {
  [key: string]: any
}

export interface LogEntry {
  context?: LogContext
  error?: Error
  level: LogLevel
  message: string
  timestamp: string
}

class Logger {
  private readonly CACHE_DURATION = 30000 // 30 seconds cache
  private isDevelopment: boolean
  private isEnabled: boolean
  private logLevel: LogLevel
  private payload: null | Payload = null
  private tenantSettingsCache: { lastChecked: number; loggerEnabled: boolean } | null = null

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO
    // Initialize with environment variables, will be updated by tenant settings if available
    this.isEnabled =
      process.env.LOGGER_ENABLED === 'true' ||
      (process.env.LOGGER_ENABLED !== 'false' && this.isDevelopment)
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    let formattedMessage = `${prefix} ${message}`

    if (context && Object.keys(context).length > 0) {
      formattedMessage += ` | Context: ${JSON.stringify(context)}`
    }

    if (error) {
      formattedMessage += ` | Error: ${error.message}`
      if (error.stack) {
        formattedMessage += ` | Stack: ${error.stack}`
      }
    }

    return formattedMessage
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): Promise<void> {
    // Refresh tenant settings if we have a payload instance
    if (this.payload) {
      await this.refreshTenantSettings()
    }

    if (!this.shouldLog(level)) {
      return
    }

    const formattedMessage = this.formatMessage(level, message, context, error)

    // In development, use console methods for better debugging
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage)
          break
        case LogLevel.ERROR:
          console.error(formattedMessage)
          break
        case LogLevel.INFO:
          console.info(formattedMessage)
          break
        case LogLevel.WARN:
          console.warn(formattedMessage)
          break
      }
    } else {
      // In production, use structured logging for better integration with monitoring systems
      // This can be easily extended to send to external logging services
      console.log(formattedMessage)
    }
  }

  /**
   * Refresh logger settings from tenant settings with caching
   */
  private async refreshTenantSettings(): Promise<void> {
    if (!this.payload) {
      return // No payload instance, use environment variables only
    }

    const now = Date.now()

    // Check cache first
    if (
      this.tenantSettingsCache &&
      now - this.tenantSettingsCache.lastChecked < this.CACHE_DURATION
    ) {
      this.isEnabled = this.tenantSettingsCache.loggerEnabled
      return
    }

    try {
      // Try to get from TenantSetting global
      const globalSettings = await this.payload.findGlobal({
        slug: 'tenant-setting',
      })

      if (globalSettings && globalSettings.loggerEnabled !== undefined) {
        // Tenant settings explicitly set (true or false) - use tenant setting
        this.isEnabled = globalSettings.loggerEnabled
        // Update cache
        this.tenantSettingsCache = {
          lastChecked: now,
          loggerEnabled: globalSettings.loggerEnabled,
        }
      } else if (globalSettings && globalSettings.loggerEnabled === undefined) {
        // Tenant settings exist but loggerEnabled is not set - fall back to environment
        this.isEnabled =
          process.env.LOGGER_ENABLED === 'true' ||
          (process.env.LOGGER_ENABLED !== 'false' && this.isDevelopment)
        // Update cache with fallback value
        this.tenantSettingsCache = {
          lastChecked: now,
          loggerEnabled: this.isEnabled,
        }
      }
    } catch (_error) {
      // If global doesn't exist or error occurs, keep current settings
      // Don't log this error to avoid infinite loops
      console.warn('Failed to load tenant logger settings, using current settings')
    }
  }

  private shouldLog(level: LogLevel): boolean {
    // If logger is disabled, don't log anything
    if (!this.isEnabled) {
      return false
    }

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  // ============================================================================
  // LOGGER CONTROL METHODS
  // ============================================================================

  async debug(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.DEBUG, message, context)
  }

  async deployment(message: string, context?: LogContext): Promise<void> {
    await this.info(`[DEPLOYMENT] ${message}`, context)
  }

  /**
   * Disable all logging - no messages will be logged
   */
  disable(): void {
    this.isEnabled = false
  }

  /**
   * Enable logging - messages will be logged based on log level
   */
  enable(): void {
    this.isEnabled = true
  }

  async envVars(message: string, context?: LogContext): Promise<void> {
    await this.info(`[ENV_VARS] ${message}`, context)
  }

  async error(message: string, context?: LogContext, error?: Error): Promise<void> {
    await this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * Force refresh of tenant settings (bypasses cache)
   */
  async forceRefreshTenantSettings(): Promise<void> {
    this.tenantSettingsCache = null
    await this.refreshTenantSettings()
  }

  /**
   * Get current logger state for debugging
   */
  getLoggerState(): {
    cacheState: { lastChecked: number; loggerEnabled: boolean } | null
    envLoggerEnabled: string | undefined
    hasPayload: boolean
    isDevelopment: boolean
    isEnabled: boolean
    logLevel: LogLevel
  } {
    return {
      cacheState: this.tenantSettingsCache,
      envLoggerEnabled: process.env.LOGGER_ENABLED,
      hasPayload: !!this.payload,
      isDevelopment: this.isDevelopment,
      isEnabled: this.isEnabled,
      logLevel: this.logLevel,
    }
  }

  /**
   * Get the current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel
  }

  async info(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.INFO, message, context)
  }

  /**
   * Initialize logger with tenant settings (async)
   * Call this method when you have access to Payload instance
   */
  async initializeWithTenantSettings(payload: Payload): Promise<void> {
    this.setPayload(payload)
    await this.refreshTenantSettings()
  }

  /**
   * Check if logger is currently enabled
   */
  isLoggerEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Log errors in a structured way that's compatible with Payload's error handling
   * Use this for errors that should be shown to users via Payload's APIError
   */
  async payloadError(message: string, context?: LogContext, error?: Error): Promise<void> {
    await this.error(`[PAYLOAD] ${message}`, context, error)
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  /**
   * Set the Payload instance for tenant settings access
   */
  setPayload(payload: Payload): void {
    this.payload = payload
  }

  async sync(message: string, context?: LogContext): Promise<void> {
    await this.info(`[SYNC] ${message}`, context)
  }

  async tenant(message: string, context?: LogContext): Promise<void> {
    await this.info(`[TENANT] ${message}`, context)
  }

  async vercel(message: string, context?: LogContext): Promise<void> {
    await this.info(`[VERCEL] ${message}`, context)
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.WARN, message, context)
  }
}

// Create singleton instance
export const logger = new Logger()

// Export convenience methods with proper binding
export const debug = logger.debug.bind(logger)
export const deployment = logger.deployment.bind(logger)
export const envVars = logger.envVars.bind(logger)
export const error = logger.error.bind(logger)
export const info = logger.info.bind(logger)
export const payloadError = logger.payloadError.bind(logger)
export const sync = logger.sync.bind(logger)
export const tenant = logger.tenant.bind(logger)
export const vercel = logger.vercel.bind(logger)
export const warn = logger.warn.bind(logger)

// Export control methods with proper binding
export const disable = logger.disable.bind(logger)
export const enable = logger.enable.bind(logger)
export const getLoggerState = logger.getLoggerState.bind(logger)
export const getLogLevel = logger.getLogLevel.bind(logger)
export const isLoggerEnabled = logger.isLoggerEnabled.bind(logger)
export const setLogLevel = logger.setLogLevel.bind(logger)

// Export tenant settings methods with proper binding
export const forceRefreshTenantSettings = logger.forceRefreshTenantSettings.bind(logger)
export const initializeWithTenantSettings = logger.initializeWithTenantSettings.bind(logger)
export const setPayload = logger.setPayload.bind(logger)
