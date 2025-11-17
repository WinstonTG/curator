/**
 * Analytics API Routes
 * Handles telemetry event tracking
 */

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router: Router = Router();

// ========================================
// POST /api/analytics/events
// Track analytics events (onboarding_started, onboarding_completed, etc.)
// Optional authentication - uses authenticated user ID if available
// ========================================

router.post('/analytics/events', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { event, session_id, properties, timestamp } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'event is required' });
    }

    // Use authenticated user ID if available, otherwise null for anonymous tracking
    const user_id = req.userId || null;

    const analyticsEvent = await prisma.analyticsEvent.create({
      data: {
        event,
        user_id,
        session_id: session_id || null,
        properties: properties || {},
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    res.status(201).json({
      success: true,
      id: analyticsEvent.id,
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// ========================================
// GET /api/analytics/events
// Query analytics events (for debugging/testing)
// ========================================

router.get('/analytics/events', async (req: Request, res: Response) => {
  try {
    const { event, user_id, session_id, limit = '100' } = req.query;

    const where: any = {};
    if (event) where.event = event as string;
    if (user_id) where.user_id = user_id as string;
    if (session_id) where.session_id = session_id as string;

    const events = await prisma.analyticsEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      events: events.map((e: any) => ({
        id: e.id,
        event: e.event,
        user_id: e.user_id,
        session_id: e.session_id,
        properties: e.properties,
        timestamp: e.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
