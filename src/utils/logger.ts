/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
// ============================================================================
// LOGGING SYSTEM WITH ENABLE/DISABLE FUNCTIONALITY
// ============================================================================

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
  private isDevelopment: boolean
  private isEnabled: boolean
  private logLevel: LogLevel

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO
    // Respect LOGGER_ENABLED environment variable first, then fall back to development mode
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

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
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

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  deployment(message: string, context?: LogContext): void {
    this.info(`[DEPLOYMENT] ${message}`, context)
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

  envVars(message: string, context?: LogContext): void {
    this.info(`[ENV_VARS] ${message}`, context)
  }

  // ============================================================================
  // LOGGING METHODS
  // ============================================================================

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * Get the current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
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
  payloadError(message: string, context?: LogContext, error?: Error): void {
    this.error(`[PAYLOAD] ${message}`, context, error)
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  sync(message: string, context?: LogContext): void {
    this.info(`[SYNC] ${message}`, context)
  }

  tenant(message: string, context?: LogContext): void {
    this.info(`[TENANT] ${message}`, context)
  }

  vercel(message: string, context?: LogContext): void {
    this.info(`[VERCEL] ${message}`, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }
}

// Create singleton instance
export const logger = new Logger()

// Export convenience methods
export const { debug, deployment, envVars, error, info, payloadError, sync, tenant, vercel, warn } =
  logger

// Export control methods
export const { disable, enable, getLogLevel, isLoggerEnabled, setLogLevel } = logger
