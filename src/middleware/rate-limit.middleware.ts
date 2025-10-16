/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting to prevent abuse and brute force attacks.
 * Uses in-memory storage with cleanup - in production, use Redis for distributed rate limiting.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, ErrorCode } from '../shared/types';
import { log } from '../shared/utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstAttempt: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: AuthRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
}

/**
 * In-memory rate limit storage
 * In production, replace with Redis or similar distributed cache
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);

    // Check if entry is expired
    if (entry && Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const existing = this.get(key);

    if (existing) {
      // Increment existing entry
      existing.count++;
      this.set(key, existing);
      return existing;
    } else {
      // Create new entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstAttempt: now,
      };
      this.set(key, newEntry);
      return newEntry;
    }
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.debug(`Rate limit store cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limit store instance
const globalStore = new RateLimitStore();

/**
 * Create rate limit middleware
 *
 * @param config - Rate limit configuration
 */
export const createRateLimiter = (config: RateLimitConfig) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req: AuthRequest) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later',
  } = config;

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const key = keyGenerator(req);
      const entry = globalStore.increment(key, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      // Check if limit exceeded
      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);

        res.setHeader('Retry-After', retryAfter.toString());

        log.warn(`Rate limit exceeded for key: ${key} (${entry.count} requests)`);

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            details: {
              limit: maxRequests,
              windowMs,
              retryAfter,
              resetTime: new Date(entry.resetTime).toISOString(),
            },
          },
        });
        return;
      }

      // If configured to skip successful requests, reset on success
      if (skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode < 400) {
            const currentEntry = globalStore.get(key);
            if (currentEntry && currentEntry.count > 0) {
              currentEntry.count--;
              globalStore.set(key, currentEntry);
            }
          }
        });
      }

      next();
    } catch (error) {
      log.error('Rate limit middleware error:', error);
      // Don't block request on rate limiter error
      next();
    }
  };
};

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict rate limiter for authentication endpoints (5 requests per 15 minutes)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req: AuthRequest) => {
    // Rate limit by IP + email if provided
    const email = req.body?.email || '';
    return `auth:${req.ip}:${email}`;
  },
  message: 'Too many authentication attempts, please try again in 15 minutes',
});

// Rate limiter for password reset (1 request per hour per email)
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1,
  keyGenerator: (req: AuthRequest) => {
    const email = req.body?.email || req.ip;
    return `password-reset:${email}`;
  },
  message: 'Too many password reset requests, please try again in 1 hour',
});

// Rate limiter for email verification resend (3 requests per hour)
export const emailVerificationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyGenerator: (req: AuthRequest) => {
    const userId = req.user?.id || req.ip;
    return `email-verification:${userId}`;
  },
  message: 'Too many verification email requests, please try again in 1 hour',
});

// General API rate limiter (100 requests per 15 minutes)
export const generalApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (req: AuthRequest) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user ? `api:user:${req.user.id}` : `api:ip:${req.ip}`;
  },
  message: 'Too many API requests, please try again later',
  skipSuccessfulRequests: false,
});

// Leaderboard rate limiter (30 requests per minute)
export const leaderboardRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  keyGenerator: (req: AuthRequest) => {
    const userId = req.user?.id || req.ip;
    return `leaderboard:${userId}`;
  },
  message: 'Too many leaderboard requests, please slow down',
});

// File upload rate limiter (10 uploads per hour)
export const fileUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  keyGenerator: (req: AuthRequest) => {
    const userId = req.user?.id || req.ip;
    return `upload:${userId}`;
  },
  message: 'Too many file uploads, please try again later',
});

/**
 * IP-based rate limiter (for public endpoints)
 */
export const ipRateLimiter = (maxRequests: number = 100, windowMinutes: number = 15) => {
  return createRateLimiter({
    windowMs: windowMinutes * 60 * 1000,
    maxRequests,
    keyGenerator: (req: AuthRequest) => `ip:${req.ip}`,
  });
};

/**
 * User-based rate limiter (for authenticated endpoints)
 */
export const userRateLimiter = (maxRequests: number = 100, windowMinutes: number = 15) => {
  return createRateLimiter({
    windowMs: windowMinutes * 60 * 1000,
    maxRequests,
    keyGenerator: (req: AuthRequest) => {
      if (!req.user) {
        return `ip:${req.ip}`;
      }
      return `user:${req.user.id}`;
    },
  });
};

/**
 * Export store for testing and cleanup
 */
export const getRateLimitStore = () => globalStore;

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export const resetRateLimit = (key: string) => {
  globalStore.reset(key);
};

/**
 * Cleanup function to be called on server shutdown
 */
export const cleanupRateLimitStore = () => {
  globalStore.destroy();
};
