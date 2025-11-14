/**
 * Analytics API Tests
 */

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import prisma from '../lib/prisma';

describe('Analytics API', () => {
  const testUserId = `analytics-test-${Date.now()}`;
  const testSessionId = `session-${Date.now()}`;
  const createdEventIds: string[] = [];

  afterAll(async () => {
    // Cleanup test events
    await prisma.analyticsEvent.deleteMany({
      where: { id: { in: createdEventIds } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/analytics/events', () => {
    it('should track onboarding_started event', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          event: 'onboarding_started',
          user_id: testUserId,
          session_id: testSessionId,
          properties: {
            platform: 'web',
            timestamp: new Date().toISOString(),
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.id).toBeDefined();

      createdEventIds.push(response.body.id);

      // Verify event was created
      const event = await prisma.analyticsEvent.findUnique({
        where: { id: response.body.id },
      });

      expect(event).toBeDefined();
      expect(event?.event).toBe('onboarding_started');
      expect(event?.user_id).toBe(testUserId);
      expect(event?.session_id).toBe(testSessionId);
    });

    it('should track onboarding_completed event with properties', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          event: 'onboarding_completed',
          user_id: testUserId,
          session_id: testSessionId,
          properties: {
            interests_count: 5,
            constraints_count: 2,
            connected_accounts: 1,
            duration_seconds: 120,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      createdEventIds.push(response.body.id);

      // Verify properties were saved
      const event = await prisma.analyticsEvent.findUnique({
        where: { id: response.body.id },
      });

      const props = event?.properties as any;
      expect(props.interests_count).toBe(5);
      expect(props.constraints_count).toBe(2);
      expect(props.connected_accounts).toBe(1);
    });

    it('should require event name', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          user_id: testUserId,
          properties: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('event is required');
    });

    it('should allow events without user_id (anonymous tracking)', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          event: 'page_view',
          session_id: testSessionId,
          properties: { page: '/onboarding' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      createdEventIds.push(response.body.id);
    });

    it('should handle custom timestamp', async () => {
      const customTime = new Date('2025-01-01T00:00:00Z');

      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          event: 'test_event',
          user_id: testUserId,
          timestamp: customTime.toISOString(),
          properties: {},
        });

      expect(response.status).toBe(201);
      createdEventIds.push(response.body.id);

      const event = await prisma.analyticsEvent.findUnique({
        where: { id: response.body.id },
      });

      expect(event?.timestamp.toISOString()).toBe(customTime.toISOString());
    });
  });

  describe('GET /api/analytics/events', () => {
    it('should query events by user_id', async () => {
      const response = await request(app)
        .get('/api/analytics/events')
        .query({ user_id: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.events).toBeDefined();
      expect(Array.isArray(response.body.events)).toBe(true);

      // Should have at least the events we created for this user
      const userEvents = response.body.events.filter((e: any) => e.user_id === testUserId);
      expect(userEvents.length).toBeGreaterThan(0);
    });

    it('should query events by event type', async () => {
      const response = await request(app)
        .get('/api/analytics/events')
        .query({ event: 'onboarding_started' });

      expect(response.status).toBe(200);
      expect(response.body.events).toBeDefined();

      // All returned events should have the specified event type
      response.body.events.forEach((e: any) => {
        expect(e.event).toBe('onboarding_started');
      });
    });

    it('should query events by session_id', async () => {
      const response = await request(app)
        .get('/api/analytics/events')
        .query({ session_id: testSessionId });

      expect(response.status).toBe(200);
      expect(response.body.events).toBeDefined();

      // All returned events should have the specified session
      response.body.events.forEach((e: any) => {
        expect(e.session_id).toBe(testSessionId);
      });
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/events')
        .query({ limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.events.length).toBeLessThanOrEqual(2);
    });

    it('should return events ordered by timestamp descending', async () => {
      const response = await request(app)
        .get('/api/analytics/events')
        .query({ user_id: testUserId, limit: 10 });

      expect(response.status).toBe(200);

      const events = response.body.events;
      if (events.length > 1) {
        const timestamps = events.map((e: any) => new Date(e.timestamp).getTime());
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
        }
      }
    });
  });
});
