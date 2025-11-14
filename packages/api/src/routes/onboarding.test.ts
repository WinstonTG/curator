/**
 * Onboarding API Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import prisma from '../lib/prisma';

describe('Onboarding API', () => {
  const testUserId = `test-user-${Date.now()}`;

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.user.delete({ where: { id: testUserId } });
    } catch (error) {
      // User may not exist
    }
    await prisma.$disconnect();
  });

  describe('POST /api/onboarding/profile', () => {
    it('should create user profile with interests and constraints', async () => {
      const response = await request(app)
        .post('/api/onboarding/profile')
        .send({
          user_id: testUserId,
          interests: [
            { domain: 'music', value: 'Jazz', weight: 0.8, source: 'explicit' },
            { domain: 'news', value: 'Technology', weight: 0.9, source: 'explicit' },
          ],
          constraints: [
            { domain: 'recipes', type: 'dietary_restriction', value: 'Vegetarian' },
            { domain: 'news', type: 'avoid_topic', value: 'Politics' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        user_id: testUserId,
        interests: 2,
        constraints: 2,
      });

      // Verify data was created
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user).toBeDefined();

      const interests = await prisma.interest.findMany({ where: { user_id: testUserId } });
      expect(interests).toHaveLength(2);
      expect(interests[0].domain).toBe('music');
      expect(interests[0].value).toBe('Jazz');

      const constraints = await prisma.constraint.findMany({ where: { user_id: testUserId } });
      expect(constraints).toHaveLength(2);
      expect(constraints[0].domain).toBe('recipes');
      expect(constraints[0].value).toBe('Vegetarian');
    });

    it('should require user_id', async () => {
      const response = await request(app)
        .post('/api/onboarding/profile')
        .send({
          interests: [],
          constraints: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('user_id is required');
    });

    it('should handle empty interests and constraints', async () => {
      const userId = `test-empty-${Date.now()}`;

      const response = await request(app)
        .post('/api/onboarding/profile')
        .send({
          user_id: userId,
          interests: [],
          constraints: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.interests).toBe(0);
      expect(response.body.constraints).toBe(0);

      // Cleanup
      await prisma.user.delete({ where: { id: userId } });
    });
  });

  describe('POST /api/onboarding/connect/:provider', () => {
    beforeAll(async () => {
      // Ensure test user exists
      await prisma.user.upsert({
        where: { id: testUserId },
        update: {},
        create: {
          id: testUserId,
          email: `${testUserId}@example.com`,
          display_name: testUserId,
        },
      });
    });

    it('should connect OAuth provider', async () => {
      const response = await request(app)
        .post('/api/onboarding/connect/spotify')
        .send({ user_id: testUserId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        provider: 'spotify',
      });

      // Verify provider was added
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.oauth_providers).toContain('spotify');
    });

    it('should not duplicate providers', async () => {
      // Connect spotify again
      await request(app)
        .post('/api/onboarding/connect/spotify')
        .send({ user_id: testUserId });

      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      const providers = user?.oauth_providers as string[];
      const spotifyCount = providers.filter(p => p === 'spotify').length;

      expect(spotifyCount).toBe(1);
    });

    it('should require user_id', async () => {
      const response = await request(app)
        .post('/api/onboarding/connect/google')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('user_id is required');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/onboarding/connect/github')
        .send({ user_id: 'non-existent-user-12345' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});
