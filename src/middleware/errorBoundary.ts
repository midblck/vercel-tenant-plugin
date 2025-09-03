// ============================================================================
// ERROR BOUNDARY MIDDLEWARE
// ============================================================================

import type { PayloadRequest } from 'payload'
import { logger } from '../utils/logger'
import { formatErrorResponse } from '../utils/errors'

interface ErrorWithStatus extends Error {
  status?: number
  statusCode?: number
}

// Payload-compatible request/response types
type Request = PayloadRequest
type Response = any // Simplified for now
type NextFunction = () => void

// Error boundary middleware to catch all errors
export const errorBoundary = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log the error with context
  logger.error('Unhandled error in middleware', {
    error: error.message,
    method: req.method || 'unknown',
    stack: error.stack,
    url: req.url || 'unknown',
  })

  // Determine status code
  const statusCode = error.status || error.statusCode || 500

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production'
  const message = isProduction && statusCode === 500 ? 'Internal server error' : error.message

  // Format error response
  const errorResponse = formatErrorResponse({
    ...error,
    message,
    status: statusCode,
  })

  // Send error response
  res.status(statusCode).json(errorResponse)
}

// Async error wrapper for route handlers
export const asyncHandler = <T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>,
) => {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Not found handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found', {
    method: req.method || 'unknown',
    url: req.url || 'unknown',
  })

  res.status(404).json({
    error: 'Route not found',
    method: req.method || 'unknown',
    path: req.url || 'unknown',
    success: false,
  })
}

// Health check endpoint
export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    environment: process.env.NODE_ENV || 'development',
    message: 'Service is healthy',
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()

  // Log request start
  logger.info('Request started', {
    method: req.method || 'unknown',
    url: req.url || 'unknown',
  })

  // Override res.end to log response
  const originalEnd = res.end
  res.end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime

    logger.info('Request completed', {
      duration: `${duration}ms`,
      method: req.method || 'unknown',
      statusCode: res.statusCode,
      url: req.url || 'unknown',
    })

    originalEnd.call(this, chunk, encoding)
  }

  next()
}

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.set({
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  })

  // CORS headers (if needed)
  const origin = (req.headers as any).origin
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Allow-Credentials', 'true')
  }

  next()
}

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      logger.warn('Request timeout', {
        method: req.method || 'unknown',
        timeout: timeoutMs,
        url: req.url || 'unknown',
      })

      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          success: false,
          timeout: timeoutMs,
        })
      }
    }, timeoutMs)

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout))
    res.on('close', () => clearTimeout(timeout))

    next()
  }
}

// Export all middleware
export const middleware = {
  asyncHandler,
  errorBoundary,
  healthCheck,
  notFoundHandler,
  requestLogger,
  requestTimeout,
  securityHeaders,
}
