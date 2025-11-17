/**
 * Authentication API Tests
 * Tests for registration, login, logout, and current user endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import prisma from '../lib/prisma';
import app from '../index';

describe('Authentication API', () => {
  let testUserId: string;
  let authCookie: string;

  // Cleanup test users after all tests
  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          OR: [
            { email: 'test@example.com' },
            { email: 'test2@example.com' },
            { email: 'invalid@example.com' },
          ],
        },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          display_name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.display_name).toBe('Test User');
      expect(response.body.user.id).toBeDefined();

      // Check that cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.startsWith('curator_token='))).toBe(true);

      // Save user ID for other tests
      testUserId = response.body.user.id;
    });

    it('should reject registration with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com', // Same email as above
          password: 'password456',
          display_name: 'Another User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already registered');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          display_name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'weak', // Too short
          display_name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must be');
    });

    it('should reject registration without display name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'password123',
          display_name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Display name is required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');

      // Check that cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.startsWith('curator_token='))).toBe(true);

      // Save cookie for other tests
      authCookie = cookies.find((cookie: string) => cookie.startsWith('curator_token='))!;
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject login without email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email and password are required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [authCookie]);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.id).toBe(testUserId);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['curator_token=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid or expired token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check that cookie was cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('curator_token='))).toBe(true);
    });
  });

  describe('Protected route with auth middleware', () => {
    it('should allow access to protected route when authenticated', async () => {
      // First login to get a fresh cookie
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'].find((c: string) => c.startsWith('curator_token='))!;

      // Try to access protected onboarding endpoint
      const response = await request(app)
        .post('/api/onboarding/profile')
        .set('Cookie', [cookie])
        .send({
          interests: [{ domain: 'music', value: 'Jazz', weight: 0.8, source: 'explicit' }],
          constraints: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should deny access to protected route when not authenticated', async () => {
      const response = await request(app)
        .post('/api/onboarding/profile')
        .send({
          interests: [],
          constraints: [],
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });
  });
});
