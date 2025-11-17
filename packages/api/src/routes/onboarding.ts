/**
 * Onboarding API Routes
 * Handles profile creation and account connections during onboarding
 */

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: Router = Router();

// ========================================
// POST /api/onboarding/profile
// Save user interests and constraints from onboarding wizard
// Requires authentication
// ========================================

router.post('/onboarding/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { interests, constraints } = req.body;
    const user_id = req.userId!; // From requireAuth middleware

    // Create interests
    const createdInterests = [];
    if (interests && Array.isArray(interests)) {
      for (const interest of interests) {
        const created = await prisma.interest.create({
          data: {
            user_id,
            domain: interest.domain,
            type: 'topic', // Generic type for onboarding
            value: interest.value,
            weight: interest.weight || 0.8,
            source: interest.source || 'explicit',
          },
        });
        createdInterests.push(created);
      }
    }

    // Create constraints
    const createdConstraints = [];
    if (constraints && Array.isArray(constraints)) {
      for (const constraint of constraints) {
        const created = await prisma.constraint.create({
          data: {
            user_id,
            domain: constraint.domain,
            type: constraint.type,
            value: constraint.value,
            reason: constraint.reason,
          },
        });
        createdConstraints.push(created);
      }
    }

    res.status(201).json({
      success: true,
      user_id,
      interests: createdInterests.length,
      constraints: createdConstraints.length,
    });
  } catch (error) {
    console.error('Error saving onboarding profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// ========================================
// POST /api/onboarding/connect/:provider
// Stub for OAuth connection (e.g., Spotify, Google, GitHub)
// Requires authentication
// ========================================

router.post('/onboarding/connect/:provider', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { provider } = req.params;
    const user_id = req.userId!; // From requireAuth middleware

    // Stub: In production, this would initiate OAuth flow
    // For now, we'll just update the user's oauth_providers array

    const user = await prisma.user.findUnique({ where: { id: user_id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentProviders = (user.oauth_providers as string[]) || [];
    if (!currentProviders.includes(provider)) {
      await prisma.user.update({
        where: { id: user_id },
        data: {
          oauth_providers: [...currentProviders, provider],
        },
      });
    }

    res.status(200).json({
      success: true,
      provider,
      message: `Connected to ${provider} (stub)`,
    });
  } catch (error) {
    console.error('Error connecting account:', error);
    res.status(500).json({ error: 'Failed to connect account' });
  }
});

export default router;
