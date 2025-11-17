/**
 * GDPR Data Export API Routes
 * Handles user data export requests for GDPR compliance
 */

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: Router = Router();

// ========================================
// GET /api/gdpr/export
// Export all user data in JSON format (GDPR compliance)
// Requires authentication - users can only export their own data
// ========================================

router.get('/gdpr/export', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!; // From requireAuth middleware

    // Fetch all user data
    const [user, interests, constraints, vectors, interactions, analyticsEvents] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.interest.findMany({ where: { user_id: userId } }),
      prisma.constraint.findMany({ where: { user_id: userId } }),
      prisma.preferenceVector.findMany({ where: { user_id: userId } }),
      prisma.interactionHistory.findMany({ where: { user_id: userId } }),
      prisma.analyticsEvent.findMany({ where: { user_id: userId } }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare export data
    const exportData = {
      export_info: {
        user_id: userId,
        export_date: new Date().toISOString(),
        format_version: '1.0',
        gdpr_compliant: true,
      },
      user_profile: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        last_login: user.last_login?.toISOString(),
        oauth_providers: user.oauth_providers,
      },
      interests: interests.map((i: any) => ({
        id: i.id,
        domain: i.domain,
        type: i.type,
        value: i.value,
        weight: i.weight,
        source: i.source,
        created_at: i.created_at.toISOString(),
        updated_at: i.updated_at.toISOString(),
      })),
      constraints: constraints.map((c: any) => ({
        id: c.id,
        domain: c.domain,
        type: c.type,
        value: c.value,
        reason: c.reason,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
      })),
      preference_vectors: vectors.map((v: any) => ({
        id: v.id,
        domain: v.domain,
        vector_length: Array.isArray(v.vector) ? (v.vector as any[]).length : 0,
        generated_from: v.generated_from,
        last_updated: v.last_updated.toISOString(),
        version: v.version,
        created_at: v.created_at.toISOString(),
      })),
      interaction_history: interactions.map((h: any) => ({
        id: h.id,
        item_id: h.item_id,
        domain: h.domain,
        action: h.action,
        feedback: h.feedback,
        context: h.context,
        timestamp: h.timestamp.toISOString(),
      })),
      analytics_events: analyticsEvents.map((e: any) => ({
        id: e.id,
        event: e.event,
        session_id: e.session_id,
        properties: e.properties,
        timestamp: e.timestamp.toISOString(),
      })),
      summary: {
        total_interests: interests.length,
        total_constraints: constraints.length,
        total_interactions: interactions.length,
        total_analytics_events: analyticsEvents.length,
        domains_used: [...new Set([
          ...interests.map((i: any) => i.domain),
          ...constraints.map((c: any) => c.domain),
        ])],
      },
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="curator-data-export-${userId}-${Date.now()}.json"`
    );

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ========================================
// DELETE /api/gdpr/delete
// Delete all user data (GDPR right to be forgotten)
// Requires authentication - users can only delete their own account
// ========================================

router.delete('/gdpr/delete', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!; // From requireAuth middleware
    const { confirm } = req.body;

    if (confirm !== 'DELETE') {
      return res.status(400).json({
        error: 'Confirmation required. Send { "confirm": "DELETE" } in request body',
      });
    }

    // Delete user (cascade will handle related records)
    const deleted = await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: `All data for user ${userId} has been permanently deleted`,
      deleted_at: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Failed to delete user data' });
  }
});

export default router;
