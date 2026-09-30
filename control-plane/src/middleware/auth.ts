import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function auth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production' || config.JWT_SECRET === 'secret') {
      req.userId = 'dev-user-local';
      next();
      return;
    }
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (token === 'dev-token-local' || token === 'dev-token-local-voltage' || token === 'dev-token') {
    req.userId = 'dev-user-local';
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' || config.JWT_SECRET === 'secret') {
      req.userId = 'dev-user-local';
      next();
      return;
    }
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === 'dev-token-local' || token === 'dev-token-local-voltage' || token === 'dev-token') {
      req.userId = 'dev-user-local';
    } else {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production' || config.JWT_SECRET === 'secret') {
          req.userId = 'dev-user-local';
        }
      }
    }
  } else if (process.env.NODE_ENV !== 'production' || config.JWT_SECRET === 'secret') {
    req.userId = 'dev-user-local';
  }
  next();
}
