"use strict";
/**
 * Rate limiting middleware to prevent abuse
 * Uses in-memory store for simplicity; for production, use redis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageLimiter = exports.ttsLimiter = exports.authLimiter = exports.generalLimiter = exports.createRateLimiter = void 0;
const config_1 = require("../constants/config");
const requestStore = {};
/**
 * Create a rate limiter middleware
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
const createRateLimiter = (maxRequests = config_1.RATE_LIMIT_CONFIG.MAX_REQUESTS, windowMs = config_1.RATE_LIMIT_CONFIG.WINDOW_MS) => {
    return (req, res, next) => {
        // Use IP address as identifier
        const identifier = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        // Initialize store for this IP if needed
        if (!requestStore[identifier]) {
            requestStore[identifier] = [];
        }
        // Remove old requests outside the window
        requestStore[identifier] = requestStore[identifier].filter((timestamp) => now - timestamp < windowMs);
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
exports.createRateLimiter = createRateLimiter;
/**
 * Specific rate limiters for different endpoints
 */
exports.generalLimiter = (0, exports.createRateLimiter)();
exports.authLimiter = (0, exports.createRateLimiter)(Math.floor(config_1.RATE_LIMIT_CONFIG.MAX_REQUESTS / 2), config_1.RATE_LIMIT_CONFIG.WINDOW_MS);
exports.ttsLimiter = (0, exports.createRateLimiter)(config_1.RATE_LIMIT_CONFIG.TTS_MAX_REQUESTS, config_1.RATE_LIMIT_CONFIG.WINDOW_MS);
exports.imageLimiter = (0, exports.createRateLimiter)(config_1.RATE_LIMIT_CONFIG.IMAGE_MAX_REQUESTS, config_1.RATE_LIMIT_CONFIG.WINDOW_MS);
/**
 * Cleanup old entries periodically (every hour)
 */
setInterval(() => {
    const now = Date.now();
    const windowMs = config_1.RATE_LIMIT_CONFIG.WINDOW_MS;
    Object.keys(requestStore).forEach((identifier) => {
        requestStore[identifier] = requestStore[identifier].filter((timestamp) => now - timestamp < windowMs);
        // Remove empty entries
        if (requestStore[identifier].length === 0) {
            delete requestStore[identifier];
        }
    });
}, 60 * 60 * 1000);
exports.default = {
    createRateLimiter: exports.createRateLimiter,
    generalLimiter: exports.generalLimiter,
    authLimiter: exports.authLimiter,
    ttsLimiter: exports.ttsLimiter,
    imageLimiter: exports.imageLimiter,
};
//# sourceMappingURL=rateLimiter.js.map