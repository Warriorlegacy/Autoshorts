/**
 * Response utility for consistent API response formatting
 * Usage: res.sendSuccess(data) or res.sendError(message, statusCode)
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

declare global {
  namespace Express {
    interface Response {
      sendSuccess<T>(data: T, statusCode?: number, message?: string): Response;
      sendError(message: string, statusCode?: number, code?: string, details?: any): Response;
    }
  }
}

/**
 * Response formatting middleware
 */
export const responseFormatter = (req: any, res: Response, next: any) => {
  // Send success response
  res.sendSuccess = function<T>(data: T, statusCode = 200, message?: string) {
    return this.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    } as ApiResponse<T>);
  };

  // Send error response
  res.sendError = function(message: string, statusCode = 500, code?: string, details?: any) {
    return this.status(statusCode).json({
      success: false,
      error: {
        code: code || 'ERROR',
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  };

  next();
};

export default responseFormatter;
