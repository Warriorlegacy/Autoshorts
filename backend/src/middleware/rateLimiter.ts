/**
 * Rate limiting middleware to prevent abuse
 * Uses in-memory store for simplicity; for production, use redis
 */

import { Request, Response, NextFunction } from 'express';
import { RATE_LIMIT_CONFIG } from '../constants/config';

interface RateLimitStore {
  [key: string]: number[];
}

const requestStore: RateLimitStore = {};

/**
 * Create a rate limiter middleware
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export const createRateLimiter = (
  maxRequests = RATE_LIMIT_CONFIG.MAX_REQUESTS,
  windowMs = RATE_LIMIT_CONFIG.WINDOW_MS
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address as identifier
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Initialize store for this IP if needed
    if (!requestStore[identifier]) {
      requestStore[identifier] = [];
    }

    // Remove old requests outside the window
    requestStore[identifier] = requestStore[identifier].filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Check if limit exceeded
    if (requestStore[identifier].length >= maxRequests) {
      const resetTime = new Date(requestStore[identifier][0] + windowMs).toISOString();
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again later.`,
          retryAfter: Math.ceil((requestStore[identifier][0] + windowMs - now) / 1000),
          resetTime,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Add current request
    requestStore[identifier].push(now);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': String(maxRequests),
      'X-RateLimit-Remaining': String(maxRequests - requestStore[identifier].length),
      'X-RateLimit-Reset': String(new Date(requestStore[identifier][0] + windowMs).getTime()),
    });

    next();
  };
};

/**
 * Specific rate limiters for different endpoints
 */
export const generalLimiter = createRateLimiter();

export const authLimiter = createRateLimiter(
  Math.floor(RATE_LIMIT_CONFIG.MAX_REQUESTS / 2),
  RATE_LIMIT_CONFIG.WINDOW_MS
);

export const ttsLimiter = createRateLimiter(
  RATE_LIMIT_CONFIG.TTS_MAX_REQUESTS,
  RATE_LIMIT_CONFIG.WINDOW_MS
);

export const imageLimiter = createRateLimiter(
  RATE_LIMIT_CONFIG.IMAGE_MAX_REQUESTS,
  RATE_LIMIT_CONFIG.WINDOW_MS
);

/**
 * Cleanup old entries periodically (every hour)
 */
setInterval(() => {
  const now = Date.now();
  const windowMs = RATE_LIMIT_CONFIG.WINDOW_MS;
  
  Object.keys(requestStore).forEach((identifier) => {
    requestStore[identifier] = requestStore[identifier].filter(
      (timestamp) => now - timestamp < windowMs
    );
    
    // Remove empty entries
    if (requestStore[identifier].length === 0) {
      delete requestStore[identifier];
    }
  });
}, 60 * 60 * 1000);

export default {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  ttsLimiter,
  imageLimiter,
};
