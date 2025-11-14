/**
 * GDPR Data Export/Delete API Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import prisma from '../lib/prisma';

describe('GDPR API', () => {
  const testUserId = `gdpr-test-${Date.now()}`;

  beforeAll(async () => {
    // Create test user with data
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        display_name: 'GDPR Test User',
        oauth_providers: ['spotify', 'google'],
      },
    });

    // Add interests
    await prisma.interest.createMany({
      data: [
        { user_id: testUserId, domain: 'music', type: 'genre', value: 'Jazz', weight: 0.8, source: 'explicit' },
        { user_id: testUserId, domain: 'news', type: 'topic', value: 'Technology', weight: 0.9, source: 'explicit' },
      ],
    });

    // Add constraints
    await prisma.constraint.createMany({
      data: [
        { user_id: testUserId, domain: 'recipes', type: 'dietary_restriction', value: 'Vegetarian' },
      ],
    });

    // Add interaction history
    await prisma.interactionHistory.createMany({
      data: [
        { user_id: testUserId, item_id: 'item-1', domain: 'music', action: 'saved' },
        { user_id: testUserId, item_id: 'item-2', domain: 'news', action: 'viewed' },
      ],
    });

    // Add analytics events
    await prisma.analyticsEvent.createMany({
      data: [
        { event: 'onboarding_started', user_id: testUserId, session_id: 'session-1', properties: {} },
        { event: 'onboarding_completed', user_id: testUserId, session_id: 'session-1', properties: {} },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.user.delete({ where: { id: testUserId } });
    } catch (error) {
      // User may have been deleted in tests
    }
    await prisma.$disconnect();
  });

  describe('GET /api/gdpr/export/:userId', () => {
    it('should export all user data', async () => {
      const response = await request(app)
        .get(`/api/gdpr/export/${testUserId}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');

      const exportData = response.body;

      // Check export structure
      expect(exportData.export_info).toBeDefined();
      expect(exportData.export_info.user_id).toBe(testUserId);
      expect(exportData.export_info.gdpr_compliant).toBe(true);

      // Check user profile
      expect(exportData.user_profile).toBeDefined();
      expect(exportData.user_profile.email).toBe(`${testUserId}@example.com`);
      expect(exportData.user_profile.oauth_providers).toEqual(['spotify', 'google']);

      // Check interests
      expect(exportData.interests).toHaveLength(2);
      expect(exportData.interests[0].domain).toBe('music');
      expect(exportData.interests[0].value).toBe('Jazz');

      // Check constraints
      expect(exportData.constraints).toHaveLength(1);
      expect(exportData.constraints[0].value).toBe('Vegetarian');

      // Check interaction history
      expect(exportData.interaction_history).toHaveLength(2);
      expect(exportData.interaction_history[0].action).toBe('saved');

      // Check analytics events
      expect(exportData.analytics_events).toHaveLength(2);
      expect(exportData.analytics_events[0].event).toBe('onboarding_started');

      // Check summary
      expect(exportData.summary).toBeDefined();
      expect(exportData.summary.total_interests).toBe(2);
      expect(exportData.summary.total_constraints).toBe(1);
      expect(exportData.summary.total_interactions).toBe(2);
      expect(exportData.summary.total_analytics_events).toBe(2);
      expect(exportData.summary.domains_used).toContain('music');
      expect(exportData.summary.domains_used).toContain('news');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/gdpr/export/non-existent-user-12345');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('DELETE /api/gdpr/delete/:userId', () => {
    it('should require confirmation', async () => {
      const response = await request(app)
        .delete(`/api/gdpr/delete/${testUserId}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Confirmation required');
    });

    it('should delete user and all related data', async () => {
      const deleteUserId = `delete-test-${Date.now()}`;

      // Create user
      await prisma.user.create({
        data: {
          id: deleteUserId,
          email: `${deleteUserId}@example.com`,
          display_name: 'Delete Test',
        },
      });

      // Add some data
      await prisma.interest.create({
        data: {
          user_id: deleteUserId,
          domain: 'music',
          type: 'genre',
          value: 'Rock',
          weight: 0.7,
          source: 'explicit',
        },
      });

      // Delete with confirmation
      const response = await request(app)
        .delete(`/api/gdpr/delete/${deleteUserId}`)
        .send({ confirm: deleteUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('permanently deleted');

      // Verify user is gone
      const user = await prisma.user.findUnique({ where: { id: deleteUserId } });
      expect(user).toBeNull();

      // Verify interests are gone (cascade delete)
      const interests = await prisma.interest.findMany({ where: { user_id: deleteUserId } });
      expect(interests).toHaveLength(0);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/gdpr/delete/non-existent-user-12345')
        .send({ confirm: 'non-existent-user-12345' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});
