import { NextRequest } from 'next/server';

/**
 * In-memory rate limiter using Map storage.
 * Redis-ready architecture - can swap storage layer later.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.storage.forEach((entry, key) => {
        if (entry.resetAt < now) {
          this.storage.delete(key);
        }
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request should be rate limited
   * @param key - Unique identifier (e.g., IP address)
   * @param limit - Max requests allowed in window
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and retry info
   */
  check(key: string, limit: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry || entry.resetAt < now) {
      // First request or window expired - create new entry
      const resetAt = now + windowMs;
      this.storage.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      };
    }

    // Within window - check if limit exceeded
    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      };
    }

    // Increment counter
    entry.count++;
    this.storage.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Extract client IP from Next.js request
 * Checks x-forwarded-for header first (for proxies/load balancers)
 * Falls back to connection IP
 */
export function getClientIP(request: NextRequest): string {
  // Check x-forwarded-for header (comma-separated list, first is client)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // Check x-real-ip header
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to 'unknown' if no IP detected
  // In production with proper proxy setup, this should rarely happen
  return 'unknown';
}

/**
 * Rate limit middleware for API routes
 * @param request - Next.js request object
 * @param limit - Max requests per window
 * @param windowMs - Time window in milliseconds
 * @returns Response if rate limited, null if allowed
 */
export function checkRateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number
): Response | null {
  const ip = getClientIP(request);
  const key = `ratelimit:${ip}`;

  const result = rateLimiter.check(key, limit, windowMs);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        },
      }
    );
  }

  return null;
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  // 60 requests per minute for read operations
  availability: {
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  // 10 requests per minute for write operations
  booking: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // 5 requests per minute for auth operations
  auth: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // 5 cancellations per hour
  cancellation: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // 120 requests per minute for admin read operations
  adminRead: {
    limit: 120,
    windowMs: 60 * 1000, // 1 minute
  },
  // 30 requests per minute for admin write operations
  adminWrite: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
};

export default rateLimiter;
