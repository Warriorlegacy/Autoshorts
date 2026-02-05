import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../constants/config';

// Validate JWT_SECRET is set before using middleware
if (!JWT_CONFIG.SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable not set. Cannot initialize authentication middleware.');
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Also export as AuthenticatedRequest for backwards compatibility
export type AuthenticatedRequest = AuthRequest;

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET as string) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Also export as authenticateToken for backwards compatibility
export const authenticateToken = authMiddleware;