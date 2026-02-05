/**
 * Global error handling middleware for Express
 * Ensures consistent error responses and prevents unhandled crashes
 */

import { Request, Response, NextFunction } from 'express';
import { LOG_CONFIG } from '../constants/config';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error handling middleware
 * Must be registered LAST in the middleware stack
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logLevel = LOG_CONFIG.LEVEL || 'error';
  
  // Log error with full details
  const errorLog = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    message: err.message,
    stack: err.stack,
  };
  
  if (logLevel !== 'silent') {
    console.error('ERROR:', JSON.stringify(errorLog, null, 2));
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
        details: err.details,
        path: req.path,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Invalid or expired authentication token',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle database errors
  if (err.name === 'DatabaseError' || err.message.includes('SQLITE_ERROR')) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Generic error response for unhandled errors
  const statusCode = (err as any).statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      details: isDevelopment ? errorLog : undefined,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 Not Found handler
 * Should be registered after all routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async route wrapper to catch async errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => {...}))
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError,
};
