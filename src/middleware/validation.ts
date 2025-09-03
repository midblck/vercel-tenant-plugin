// ============================================================================
// SIMPLE VALIDATION MIDDLEWARE (No external dependencies)
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadRequest } from 'payload'
import { logger } from '../utils/logger'

// Payload-compatible request/response types
type Request = PayloadRequest
type Response = any // Simplified for now
type NextFunction = () => void

// Simple validation functions
export const validators = {
  environment: (value: any): null | string => {
    const validEnvironments = ['production', 'preview', 'development']
    if (!validEnvironments.includes(value)) {
      return 'Environment must be production, preview, or development'
    }
    return null
  },
  projectId: (value: any): null | string => {
    if (!value || typeof value !== 'string' || value.length < 1) {
      return 'Project ID is required'
    }
    return null
  },
  teamId: (_value: any): null | string => {
    // Optional field, no validation needed
    return null
  },
  tenantId: (value: any): null | string => {
    if (!value || typeof value !== 'string' || value.length < 1) {
      return 'Tenant ID is required'
    }
    return null
  },
  vercelToken: (value: any): null | string => {
    if (!value || typeof value !== 'string' || value.length < 10) {
      return 'Vercel token must be at least 10 characters'
    }
    return null
  },
}

// Simple validation functions for common patterns
export const validateRequest = {
  listProjects: (_data: any): string[] => {
    const errors: string[] = []
    // Add validation logic as needed
    return errors
  },

  syncProjects: (_data: any): string[] => {
    const errors: string[] = []
    // Add validation logic as needed
    return errors
  },

  createTenant: (data: any): string[] => {
    const errors: string[] = []
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1) {
      errors.push('Name is required')
    }
    if (!data.framework || typeof data.framework !== 'string' || data.framework.length < 1) {
      errors.push('Framework is required')
    }
    return errors
  },

  createDeployment: (data: any): string[] => {
    const errors: string[] = []
    if (!data.tenantId) {
      errors.push('Tenant ID is required')
    }
    if (!data.environment || !['development', 'preview', 'production'].includes(data.environment)) {
      errors.push('Valid environment is required')
    }
    return errors
  },

  syncDeployments: (_data: any): string[] => {
    const errors: string[] = []
    // Add validation logic as needed
    return errors
  },

  cancelDeployments: (_data: any): string[] => {
    const errors: string[] = []
    // Add validation logic as needed
    return errors
  },

  createEnvironmentVariables: (data: any): string[] => {
    const errors: string[] = []
    if (!data.tenantId) {
      errors.push('Tenant ID is required')
    }
    if (!data.variables || !Array.isArray(data.variables) || data.variables.length < 1) {
      errors.push('At least one variable is required')
    }
    return errors
  },

  updateEnvironmentVariable: (data: any): string[] => {
    const errors: string[] = []
    if (!data.tenantId) {
      errors.push('Tenant ID is required')
    }
    if (!data.variableId) {
      errors.push('Variable ID is required')
    }
    if (!data.updates || Object.keys(data.updates).length === 0) {
      errors.push('At least one update field is required')
    }
    return errors
  },
}

// Simple validation middleware
export const createValidationMiddleware = (
  validator: (data: any) => string[],
  target: 'body' | 'params' | 'query' = 'body',
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = target === 'body' ? req.body : target === 'query' ? req.query : {}
      const errors = validator(data)

      if (errors.length > 0) {
        return res.status(400).json({
          details: errors,
          error: 'Validation failed',
          success: false,
        })
      }

      next()
    } catch (error) {
      // Simplified error handling for now
      logger.error('Validation error', { endpoint: 'validation', target }, error as Error)
    }
  }
}

// Export validation middleware for common endpoints
export const validateListProjects = createValidationMiddleware(validateRequest.listProjects)
export const validateSyncProjects = createValidationMiddleware(validateRequest.syncProjects)
export const validateCreateTenant = createValidationMiddleware(validateRequest.createTenant)
export const validateCreateDeployment = createValidationMiddleware(validateRequest.createDeployment)
export const validateSyncDeployments = createValidationMiddleware(validateRequest.syncDeployments)
export const validateCancelDeployments = createValidationMiddleware(
  validateRequest.cancelDeployments,
)
export const validateCreateEnvironmentVariables = createValidationMiddleware(
  validateRequest.createEnvironmentVariables,
)
export const validateUpdateEnvironmentVariable = createValidationMiddleware(
  validateRequest.updateEnvironmentVariable,
)

// Utility function to validate data without middleware
export const validateData = <T>(validator: (data: any) => string[], data: unknown): T => {
  const errors = validator(data)
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }
  return data as T
}
