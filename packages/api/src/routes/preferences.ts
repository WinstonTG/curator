/**
 * Preference Graph CRUD API Routes
 *
 * Endpoints:
 * - GET    /api/users/:userId/preferences       - Get all preferences for a user
 * - GET    /api/users/:userId/interests         - Get all interests
 * - POST   /api/users/:userId/interests         - Create interest
 * - PUT    /api/users/:userId/interests/:id     - Update interest
 * - DELETE /api/users/:userId/interests/:id     - Delete interest
 * - GET    /api/users/:userId/constraints       - Get all constraints
 * - POST   /api/users/:userId/constraints       - Create constraint
 * - PUT    /api/users/:userId/constraints/:id   - Update constraint
 * - DELETE /api/users/:userId/constraints/:id   - Delete constraint
 * - GET    /api/users/:userId/vectors           - Get preference vectors
 * - POST   /api/users/:userId/vectors           - Create/update vector
 * - GET    /api/users/:userId/history           - Get interaction history
 * - POST   /api/users/:userId/history           - Record interaction
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import type {
  Interest,
  Constraint,
  PreferenceVector,
  InteractionHistory,
  CreateInterestPayload,
  CreateConstraintPayload,
  CreatePreferenceVectorPayload,
  CreateInteractionHistoryPayload,
} from '@curator/types';

const router: Router = Router();

// ========================================
// Get All Preferences (Graph View)
// ========================================

router.get('/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const [user, interests, constraints, vectors, history] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.interest.findMany({ where: { user_id: userId } }),
      prisma.constraint.findMany({ where: { user_id: userId } }),
      prisma.preferenceVector.findMany({ where: { user_id: userId } }),
      prisma.interactionHistory.findMany({
        where: { user_id: userId },
        orderBy: { timestamp: 'desc' },
        take: 100, // Last 100 interactions
      }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        last_login: user.last_login?.toISOString(),
        oauth_providers: user.oauth_providers as string[],
      },
      interests: interests.map(mapInterest),
      constraints: constraints.map(mapConstraint),
      vectors: vectors.map(mapVector),
      recent_history: history.map(mapHistory),
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// ========================================
// Interests CRUD
// ========================================

router.get('/users/:userId/interests', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { domain, type, source } = req.query;

    const where: any = { user_id: userId };
    if (domain) where.domain = domain;
    if (type) where.type = type;
    if (source) where.source = source;

    const interests = await prisma.interest.findMany({
      where,
      orderBy: { weight: 'desc' },
    });

    res.json(interests.map(mapInterest));
  } catch (error) {
    console.error('Error fetching interests:', error);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

router.post('/users/:userId/interests', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const payload: CreateInterestPayload = req.body;

    const interest = await prisma.interest.create({
      data: {
        user_id: userId,
        domain: payload.domain,
        type: payload.type,
        value: payload.value,
        weight: payload.weight,
        source: payload.source,
      },
    });

    res.status(201).json(mapInterest(interest));
  } catch (error) {
    console.error('Error creating interest:', error);
    res.status(500).json({ error: 'Failed to create interest' });
  }
});

router.put('/users/:userId/interests/:id', async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const updates = req.body;

    const interest = await prisma.interest.updateMany({
      where: { id, user_id: userId },
      data: updates,
    });

    if (interest.count === 0) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    const updated = await prisma.interest.findUnique({ where: { id } });
    res.json(mapInterest(updated!));
  } catch (error) {
    console.error('Error updating interest:', error);
    res.status(500).json({ error: 'Failed to update interest' });
  }
});

router.delete('/users/:userId/interests/:id', async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    const deleted = await prisma.interest.deleteMany({
      where: { id, user_id: userId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting interest:', error);
    res.status(500).json({ error: 'Failed to delete interest' });
  }
});

// ========================================
// Constraints CRUD
// ========================================

router.get('/users/:userId/constraints', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { domain, type } = req.query;

    const where: any = { user_id: userId };
    if (domain) where.domain = domain;
    if (type) where.type = type;

    const constraints = await prisma.constraint.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    res.json(constraints.map(mapConstraint));
  } catch (error) {
    console.error('Error fetching constraints:', error);
    res.status(500).json({ error: 'Failed to fetch constraints' });
  }
});

router.post('/users/:userId/constraints', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const payload: CreateConstraintPayload = req.body;

    const constraint = await prisma.constraint.create({
      data: {
        user_id: userId,
        domain: payload.domain,
        type: payload.type,
        value: payload.value,
        reason: payload.reason,
      },
    });

    res.status(201).json(mapConstraint(constraint));
  } catch (error) {
    console.error('Error creating constraint:', error);
    res.status(500).json({ error: 'Failed to create constraint' });
  }
});

router.put('/users/:userId/constraints/:id', async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const updates = req.body;

    const constraint = await prisma.constraint.updateMany({
      where: { id, user_id: userId },
      data: updates,
    });

    if (constraint.count === 0) {
      return res.status(404).json({ error: 'Constraint not found' });
    }

    const updated = await prisma.constraint.findUnique({ where: { id } });
    res.json(mapConstraint(updated!));
  } catch (error) {
    console.error('Error updating constraint:', error);
    res.status(500).json({ error: 'Failed to update constraint' });
  }
});

router.delete('/users/:userId/constraints/:id', async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;

    const deleted = await prisma.constraint.deleteMany({
      where: { id, user_id: userId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Constraint not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting constraint:', error);
    res.status(500).json({ error: 'Failed to delete constraint' });
  }
});

// ========================================
// Preference Vectors
// ========================================

router.get('/users/:userId/vectors', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { domain } = req.query;

    const where: any = { user_id: userId };
    if (domain) where.domain = domain;

    const vectors = await prisma.preferenceVector.findMany({
      where,
      orderBy: { last_updated: 'desc' },
    });

    res.json(vectors.map(mapVector));
  } catch (error) {
    console.error('Error fetching vectors:', error);
    res.status(500).json({ error: 'Failed to fetch vectors' });
  }
});

router.post('/users/:userId/vectors', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const payload: CreatePreferenceVectorPayload = req.body;

    // Upsert: update if exists for this user+domain, create otherwise
    const existing = await prisma.preferenceVector.findFirst({
      where: {
        user_id: userId,
        domain: payload.domain,
      },
    });

    let vector;
    if (existing) {
      vector = await prisma.preferenceVector.update({
        where: { id: existing.id },
        data: {
          vector: payload.vector,
          generated_from: payload.metadata.generated_from,
          last_updated: new Date(payload.metadata.last_updated),
          version: { increment: 1 },
        },
      });
    } else {
      vector = await prisma.preferenceVector.create({
        data: {
          user_id: userId,
          domain: payload.domain,
          vector: payload.vector,
          generated_from: payload.metadata.generated_from,
          last_updated: new Date(payload.metadata.last_updated),
          version: payload.metadata.version,
        },
      });
    }

    res.status(existing ? 200 : 201).json(mapVector(vector));
  } catch (error) {
    console.error('Error creating/updating vector:', error);
    res.status(500).json({ error: 'Failed to save vector' });
  }
});

// ========================================
// Interaction History
// ========================================

router.get('/users/:userId/history', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { domain, action, limit = '100' } = req.query;

    const where: any = { user_id: userId };
    if (domain) where.domain = domain;
    if (action) where.action = action;

    const history = await prisma.interactionHistory.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(history.map(mapHistory));
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.post('/users/:userId/history', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const payload: CreateInteractionHistoryPayload = req.body;

    const interaction = await prisma.interactionHistory.create({
      data: {
        user_id: userId,
        item_id: payload.item_id,
        domain: payload.domain,
        action: payload.action,
        feedback: payload.feedback,
        context: payload.context || {},
        timestamp: new Date(payload.timestamp),
      },
    });

    res.status(201).json(mapHistory(interaction));
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
});

// ========================================
// Helper Mappers (DB → API types)
// ========================================

function mapInterest(interest: any): Interest {
  return {
    id: interest.id,
    user_id: interest.user_id,
    domain: interest.domain,
    type: interest.type,
    value: interest.value,
    weight: interest.weight,
    source: interest.source,
    created_at: interest.created_at.toISOString(),
    updated_at: interest.updated_at.toISOString(),
  };
}

function mapConstraint(constraint: any): Constraint {
  return {
    id: constraint.id,
    user_id: constraint.user_id,
    domain: constraint.domain,
    type: constraint.type,
    value: constraint.value,
    reason: constraint.reason,
    created_at: constraint.created_at.toISOString(),
    updated_at: constraint.updated_at.toISOString(),
  };
}

function mapVector(vector: any): PreferenceVector {
  return {
    id: vector.id,
    user_id: vector.user_id,
    domain: vector.domain,
    vector: vector.vector,
    metadata: {
      generated_from: vector.generated_from,
      last_updated: vector.last_updated.toISOString(),
      version: vector.version,
    },
    created_at: vector.created_at.toISOString(),
    updated_at: vector.updated_at.toISOString(),
  };
}

function mapHistory(history: any): InteractionHistory {
  return {
    id: history.id,
    user_id: history.user_id,
    item_id: history.item_id,
    domain: history.domain,
    action: history.action,
    feedback: history.feedback,
    context: history.context,
    timestamp: history.timestamp.toISOString(),
  };
}

export default router;
