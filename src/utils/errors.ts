// ============================================================================
// ERROR HANDLING SYSTEM
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from './logger'

// Custom error classes that extend Error for Payload CMS compatibility
class PayloadAPIError extends Error {
  data?: any
  status: number

  constructor(message: string, status: number = 500, data?: any) {
    super(message)
    this.status = status
    this.data = data
    this.name = 'PayloadAPIError'
  }
}

// Custom error classes for specific scenarios
export class VercelAPIError extends PayloadAPIError {
  constructor(message: string, status: number = 500, data?: any) {
    super(message, status, data)
    this.name = 'VercelAPIError'
  }
}

export class TenantNotFoundError extends PayloadAPIError {
  constructor(tenantId: string) {
    super(`Tenant not found: ${tenantId}`, 404)
    this.name = 'TenantNotFoundError'
  }
}

export class ProjectNotFoundError extends PayloadAPIError {
  constructor(projectId: string) {
    super(`Vercel project not found: ${projectId}`, 404)
    this.name = 'ProjectNotFoundError'
  }
}

export class DeploymentError extends PayloadAPIError {
  constructor(message: string, status: number = 500) {
    super(`Deployment failed: ${message}`, status)
    this.name = 'DeploymentError'
  }
}

export class EnvironmentVariableError extends PayloadAPIError {
  constructor(message: string, status: number = 500) {
    super(`Environment variable error: ${message}`, status)
    this.name = 'EnvironmentVariableError'
  }
}

export class ValidationError extends PayloadAPIError {
  constructor(message: string, field?: string) {
    super(`Validation error: ${message}`, 400, { field })
    this.name = 'ValidationError'
  }
}

export class ConfigurationError extends PayloadAPIError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 500)
    this.name = 'ConfigurationError'
  }
}

// Error factory functions
export const createVercelError = (error: any, operation: string): VercelAPIError => {
  const status = error.status || error.statusCode || 500
  const message = error.message || `Vercel ${operation} failed`

  return new VercelAPIError(message, status, {
    operation,
    vercelError: error,
  })
}

export const createValidationError = (field: string, message: string): ValidationError => {
  return new ValidationError(message, field)
}

// Error response formatter
export const formatErrorResponse = (error: Error | PayloadAPIError) => {
  if (error instanceof PayloadAPIError) {
    return {
      name: error.name,
      data: error.data,
      error: error.message,
      status: error.status,
      success: false,
    }
  }

  return {
    name: error.name || 'UnknownError',
    error: error.message || 'An unexpected error occurred',
    status: 500,
    success: false,
  }
}

// Error handler wrapper for async operations
export const withErrorHandling = <T>(
  operation: () => Promise<T>,
  errorContext: string,
): Promise<T> => {
  return operation().catch((error) => {
    if (error instanceof PayloadAPIError) {
      throw error
    }

    // Log the error for debugging via proper logging system
    void logger.payloadError(
      `Operation failed in ${errorContext}`,
      {
        context: errorContext,
        originalError: error.message || 'Unknown error',
      },
      error,
    )

    // Convert to PayloadAPIError for consistent frontend handling
    throw new PayloadAPIError(`Operation failed: ${error.message || 'Unknown error'}`, 500, {
      context: errorContext,
      originalError: error,
    })
  })
}

// Input validation helpers
export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw createValidationError(fieldName, `${fieldName} is required`)
  }
}

export const validateString = (
  value: any,
  fieldName: string,
  minLength?: number,
  maxLength?: number,
): void => {
  validateRequired(value, fieldName)

  if (typeof value !== 'string') {
    throw createValidationError(fieldName, `${fieldName} must be a string`)
  }

  if (minLength && value.length < minLength) {
    throw createValidationError(fieldName, `${fieldName} must be at least ${minLength} characters`)
  }

  if (maxLength && value.length > maxLength) {
    throw createValidationError(
      fieldName,
      `${fieldName} must be no more than ${maxLength} characters`,
    )
  }
}

export const validateArray = (value: any, fieldName: string, minLength?: number): void => {
  validateRequired(value, fieldName)

  if (!Array.isArray(value)) {
    throw createValidationError(fieldName, `${fieldName} must be an array`)
  }

  if (minLength && value.length < minLength) {
    throw createValidationError(fieldName, `${fieldName} must have at least ${minLength} items`)
  }
}

export const validateObject = (value: any, fieldName: string): void => {
  validateRequired(value, fieldName)

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw createValidationError(fieldName, `${fieldName} must be an object`)
  }
}

// Common validation patterns
export const validateVercelToken = (token: string): void => {
  validateString(token, 'vercelToken', 10)
}

export const validateTenantId = (id: string): void => {
  validateString(id, 'tenantId', 1)
}

export const validateProjectId = (id: string): void => {
  validateString(id, 'projectId', 1)
}

export const validateEnvironment = (env: string): void => {
  const validEnvironments = ['production', 'preview', 'development']
  if (!validEnvironments.includes(env)) {
    throw createValidationError(
      'environment',
      `Environment must be one of: ${validEnvironments.join(', ')}`,
    )
  }
}
