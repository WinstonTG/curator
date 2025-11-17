/**
 * Authentication Middleware
 * JWT verification and user loading
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import prisma from '../lib/prisma';
import { verifyToken, JWTPayload } from '../lib/auth';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

/**
 * Extract JWT token from cookie or Authorization header
 */
function extractToken(req: Request): string | null {
  // Try cookie first (preferred for web apps)
  if (req.cookies && req.cookies.curator_token) {
    return req.cookies.curator_token;
  }

  // Fallback to Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Middleware: Require authentication
 * Verifies JWT, loads user from DB, attaches to req.user
 * Returns 401 if not authenticated
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware: Optional authentication
 * Same as requireAuth but doesn't return 401 if not authenticated
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      next();
      return;
    }

    // Verify token
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      // Invalid token, but we don't fail - just continue without user
      next();
      return;
    }

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (user) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even on error
  }
}
