/**
 * Authentication API Routes
 * User registration, login, logout, and current user endpoints
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  isValidEmail,
  isValidPassword,
} from '../lib/auth';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: Router = Router();

// Cookie configuration
const COOKIE_NAME = 'curator_token';
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

// ========================================
// POST /api/auth/register
// Create a new user account with email and password
// ========================================

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, display_name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and contain letters and numbers',
      });
    }

    if (!display_name || display_name.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        display_name: display_name.trim(),
        password_hash,
        last_login: new Date(),
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Set cookie
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    // Return user info (without password hash)
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ========================================
// POST /api/auth/login
// Authenticate user with email and password
// ========================================

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Set cookie
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    // Return user info
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        last_login: user.last_login,
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ========================================
// POST /api/auth/logout
// Clear authentication cookie
// ========================================

router.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

// ========================================
// GET /api/auth/me
// Get current authenticated user
// ========================================

router.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return user info (without password hash)
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        display_name: req.user.display_name,
        avatar_url: req.user.avatar_url,
        created_at: req.user.created_at,
        last_login: req.user.last_login,
        oauth_providers: req.user.oauth_providers,
      },
    });
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
