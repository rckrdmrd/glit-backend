/**
 * Rate Limiter Service
 *
 * Implements rate limiting for API endpoints
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Custom error for rate limit exceeded
 */
export class TooManyRequestsError extends Error {
  public statusCode = 429;
  public retryAfter: number;

  constructor(message: string = 'Too many requests', retryAfter: number = 60) {
    super(message);
    this.name = 'TooManyRequestsError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Get or create rate limiter for a specific key
 */
export function getRateLimiter(config?: RateLimitConfig) {
  // Default config: 1 request per 5 seconds
  const defaultConfig: RateLimitConfig = {
    windowMs: 5000,
    maxRequests: 1
  };

  const finalConfig = config || defaultConfig;

  return {
    check: (key: string): boolean => {
      const now = Date.now();
      const record = requestCounts.get(key);

      // Reset if window has passed
      if (!record || now > record.resetAt) {
        requestCounts.set(key, {
          count: 1,
          resetAt: now + finalConfig.windowMs
        });
        return true;
      }

      // Check if limit exceeded
      if (record.count >= finalConfig.maxRequests) {
        return false;
      }

      // Increment count
      record.count++;
      return true;
    },

    checkLimit: async (userId: string, resourceId: string): Promise<void> => {
      const key = `${userId}:${resourceId}`;
      const now = Date.now();
      const record = requestCounts.get(key);

      if (!record || now > record.resetAt) {
        requestCounts.set(key, {
          count: 1,
          resetAt: now + finalConfig.windowMs
        });
        return;
      }

      if (record.count >= finalConfig.maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        throw new TooManyRequestsError('Too many requests. Please try again later.', retryAfter);
      }

      record.count++;
    },

    reset: (key: string): void => {
      requestCounts.delete(key);
    }
  };
}

/**
 * Middleware to apply rate limiting
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  const limiter = getRateLimiter(config);

  return (req: any, res: any, next: any) => {
    const key = `${req.ip}:${req.path}`;

    if (!limiter.check(key)) {
      throw new TooManyRequestsError('Rate limit exceeded. Please try again later.');
    }

    next();
  };
}
