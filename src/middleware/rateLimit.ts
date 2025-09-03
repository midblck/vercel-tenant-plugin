// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PayloadRequest } from 'payload'

// Payload-compatible request/response types
type Request = PayloadRequest
type Response = any // Simplified for now
type NextFunction = () => void

interface RateLimitConfig {
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
  skipFailedRequests?: boolean // Skip rate limiting for failed requests
  skipSuccessfulRequests?: boolean // Skip rate limiting for successful requests
  statusCode?: number // Custom status code
  windowMs: number // Time window in milliseconds
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private config: Required<RateLimitConfig>
  private store: RateLimitStore = {}

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      message: config.message || 'Too many requests, please try again later',
      skipFailedRequests: config.skipFailedRequests || false,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      statusCode: config.statusCode || 429,
      windowMs: config.windowMs,
    }
  }

  private cleanup(): void {
    const now = Date.now()
    Object.keys(this.store).forEach((key) => {
      if (now > this.store[key].resetTime) {
        delete this.store[key]
      }
    })
  }

  private getKey(_req: Request): string {
    // Use a simple key for Payload CMS
    return 'default'
  }

  private increment(key: string): void {
    const now = Date.now()
    const record = this.store[key]

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      }
    } else {
      // Increment existing record
      record.count++
    }
  }

  private isRateLimited(key: string): boolean {
    const now = Date.now()
    const record = this.store[key]

    if (!record) {
      return false
    }

    // Check if window has expired
    if (now > record.resetTime) {
      delete this.store[key]
      return false
    }

    return record.count >= this.config.maxRequests
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Clean up expired records periodically
      if (Math.random() < 0.01) {
        // 1% chance to clean up
        this.cleanup()
      }

      const key = this.getKey(req)

      if (this.isRateLimited(key)) {
        const record = this.store[key]
        const retryAfter = Math.ceil((record.resetTime - Date.now()) / 1000)

        res.set({
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        })

        return res.status(this.config.statusCode).json({
          error: this.config.message,
          retryAfter,
          success: false,
        })
      }

      // Increment counter
      this.increment(key)

      // Set rate limit headers
      const record = this.store[key]
      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.config.maxRequests - record.count).toString(),
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
      })

      next()
    }
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: new RateLimiter({
    maxRequests: 5, // 5 requests per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),

  // Moderate rate limiting for API endpoints
  api: new RateLimiter({
    maxRequests: 60, // 60 requests per minute
    message: 'API rate limit exceeded, please try again later',
    windowMs: 1 * 60 * 1000, // 1 minute
  }),

  // Loose rate limiting for read operations
  read: new RateLimiter({
    maxRequests: 120, // 120 requests per minute
    message: 'Too many read requests, please try again later',
    windowMs: 1 * 60 * 1000, // 1 minute
  }),

  // Custom rate limiting for Vercel operations
  vercel: new RateLimiter({
    maxRequests: 30, // 30 requests per minute (Vercel has its own limits)
    message: 'Too many Vercel operations, please try again later',
    windowMs: 1 * 60 * 1000, // 1 minute
  }),
}

// Export middleware functions
export const rateLimitAuth = rateLimiters.auth.middleware()
export const rateLimitApi = rateLimiters.api.middleware()
export const rateLimitRead = rateLimiters.read.middleware()
export const rateLimitVercel = rateLimiters.vercel.middleware()

// Create custom rate limiter
export const createRateLimiter = (config: RateLimitConfig) => {
  return new RateLimiter(config).middleware()
}

// Utility to check if a request should be rate limited
export const shouldRateLimit = (req: Request, config: RateLimitConfig): boolean => {
  const limiter = new RateLimiter(config)
  const key = 'default' // Simplified for Payload CMS
  return limiter['isRateLimited'](key)
}
