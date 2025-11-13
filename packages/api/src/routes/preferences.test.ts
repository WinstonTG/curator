/**
 * Preference Graph CRUD Tests
 * Tests all endpoints with mock Prisma client
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    interest: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    constraint: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    preferenceVector: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    interactionHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import prisma from '../lib/prisma';

const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
const mockInterestId = '550e8400-e29b-41d4-a716-446655440002';

describe('Preference Graph API', () => {
  describe('GET /api/users/:userId/preferences', () => {
    it('should return complete preference graph', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-12'),
        last_login: new Date('2025-01-12'),
        oauth_providers: ['spotify'],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.interest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.constraint.findMany).mockResolvedValue([]);
      vi.mocked(prisma.preferenceVector.findMany).mockResolvedValue([]);
      vi.mocked(prisma.interactionHistory.findMany).mockResolvedValue([]);

      const res = await request(app).get(`/api/users/${mockUserId}/preferences`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('interests');
      expect(res.body).toHaveProperty('constraints');
      expect(res.body).toHaveProperty('vectors');
      expect(res.body).toHaveProperty('recent_history');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app).get(`/api/users/${mockUserId}/preferences`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('Interests CRUD', () => {
    it('should get all interests for a user', async () => {
      const mockInterests = [
        {
          id: mockInterestId,
          user_id: mockUserId,
          domain: 'music',
          type: 'genre',
          value: 'electronic',
          weight: 0.9,
          source: 'explicit',
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
        },
      ];

      vi.mocked(prisma.interest.findMany).mockResolvedValue(mockInterests);

      const res = await request(app).get(`/api/users/${mockUserId}/interests`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].domain).toBe('music');
      expect(res.body[0].value).toBe('electronic');
    });

    it('should filter interests by domain', async () => {
      vi.mocked(prisma.interest.findMany).mockResolvedValue([]);

      const res = await request(app).get(`/api/users/${mockUserId}/interests?domain=music`);

      expect(res.status).toBe(200);
      expect(prisma.interest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ domain: 'music' }),
        })
      );
    });

    it('should create a new interest', async () => {
      const newInterest = {
        user_id: mockUserId,
        domain: 'music',
        type: 'genre',
        value: 'jazz',
        weight: 0.8,
        source: 'explicit',
      };

      const createdInterest = {
        id: mockInterestId,
        ...newInterest,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(prisma.interest.create).mockResolvedValue(createdInterest);

      const res = await request(app)
        .post(`/api/users/${mockUserId}/interests`)
        .send(newInterest);

      expect(res.status).toBe(201);
      expect(res.body.domain).toBe('music');
      expect(res.body.value).toBe('jazz');
    });

    it('should update an interest', async () => {
      const updates = { weight: 0.95 };

      vi.mocked(prisma.interest.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.interest.findUnique).mockResolvedValue({
        id: mockInterestId,
        user_id: mockUserId,
        domain: 'music',
        type: 'genre',
        value: 'jazz',
        weight: 0.95,
        source: 'explicit',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .put(`/api/users/${mockUserId}/interests/${mockInterestId}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.weight).toBe(0.95);
    });

    it('should delete an interest', async () => {
      vi.mocked(prisma.interest.deleteMany).mockResolvedValue({ count: 1 });

      const res = await request(app).delete(
        `/api/users/${mockUserId}/interests/${mockInterestId}`
      );

      expect(res.status).toBe(204);
    });

    it('should return 404 when deleting non-existent interest', async () => {
      vi.mocked(prisma.interest.deleteMany).mockResolvedValue({ count: 0 });

      const res = await request(app).delete(
        `/api/users/${mockUserId}/interests/${mockInterestId}`
      );

      expect(res.status).toBe(404);
    });
  });

  describe('Constraints CRUD', () => {
    it('should get all constraints for a user', async () => {
      const mockConstraints = [
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          user_id: mockUserId,
          domain: 'recipes',
          type: 'dietary_restriction',
          value: 'vegetarian',
          reason: 'Dietary preference',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(prisma.constraint.findMany).mockResolvedValue(mockConstraints);

      const res = await request(app).get(`/api/users/${mockUserId}/constraints`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].type).toBe('dietary_restriction');
    });

    it('should create a new constraint', async () => {
      const newConstraint = {
        user_id: mockUserId,
        domain: 'recipes',
        type: 'allergen',
        value: 'peanuts',
        reason: 'Allergy',
      };

      const created = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        ...newConstraint,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(prisma.constraint.create).mockResolvedValue(created);

      const res = await request(app)
        .post(`/api/users/${mockUserId}/constraints`)
        .send(newConstraint);

      expect(res.status).toBe(201);
      expect(res.body.value).toBe('peanuts');
    });
  });

  describe('Preference Vectors', () => {
    it('should get all vectors for a user', async () => {
      const mockVectors = [
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          user_id: mockUserId,
          domain: 'music',
          vector: Array(1536).fill(0.5),
          generated_from: [mockInterestId],
          last_updated: new Date(),
          version: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(prisma.preferenceVector.findMany).mockResolvedValue(mockVectors);

      const res = await request(app).get(`/api/users/${mockUserId}/vectors`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].domain).toBe('music');
    });

    it('should create a new vector', async () => {
      const newVector = {
        user_id: mockUserId,
        domain: 'music',
        vector: Array(1536).fill(0.5),
        metadata: {
          generated_from: [mockInterestId],
          last_updated: new Date().toISOString(),
          version: 1,
        },
      };

      vi.mocked(prisma.preferenceVector.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.preferenceVector.create).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440006',
        user_id: mockUserId,
        domain: 'music',
        vector: newVector.vector,
        generated_from: newVector.metadata.generated_from,
        last_updated: new Date(newVector.metadata.last_updated),
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .post(`/api/users/${mockUserId}/vectors`)
        .send(newVector);

      expect(res.status).toBe(201);
      expect(res.body.domain).toBe('music');
    });
  });

  describe('Interaction History', () => {
    it('should get interaction history for a user', async () => {
      const mockHistory = [
        {
          id: '550e8400-e29b-41d4-a716-446655440007',
          user_id: mockUserId,
          item_id: 'item_123',
          domain: 'music',
          action: 'saved',
          feedback: 'liked',
          context: { time_of_day: 'evening' },
          timestamp: new Date(),
        },
      ];

      vi.mocked(prisma.interactionHistory.findMany).mockResolvedValue(mockHistory);

      const res = await request(app).get(`/api/users/${mockUserId}/history`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].action).toBe('saved');
    });

    it('should record a new interaction', async () => {
      const newInteraction = {
        user_id: mockUserId,
        item_id: 'item_456',
        domain: 'news',
        action: 'viewed',
        timestamp: new Date().toISOString(),
      };

      vi.mocked(prisma.interactionHistory.create).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440008',
        ...newInteraction,
        feedback: null,
        context: {},
        timestamp: new Date(newInteraction.timestamp),
      });

      const res = await request(app)
        .post(`/api/users/${mockUserId}/history`)
        .send(newInteraction);

      expect(res.status).toBe(201);
      expect(res.body.action).toBe('viewed');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });
});
