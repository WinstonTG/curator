import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// Mock feature flags
vi.mock('@/lib/featureFlags', () => ({
  getServerFeatureFlags: vi.fn(() => ({
    FEATURE_PRIVACY: true,
    FEATURE_EMBEDDINGS: false,
    FEATURE_VECTOR_SEARCH: false,
    FEATURE_CONTEXT_ENGINE: false,
    FEATURE_NOVELTY_BOOST: false,
  })),
}));

describe('/api/data/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST - Request deletion', () => {
    it('should return 403 when FEATURE_PRIVACY is disabled', async () => {
      const { getServerFeatureFlags } = await import('@/lib/featureFlags');
      vi.mocked(getServerFeatureFlags).mockReturnValueOnce({
        FEATURE_PRIVACY: false,
        FEATURE_EMBEDDINGS: false,
        FEATURE_VECTOR_SEARCH: false,
        FEATURE_CONTEXT_ENGINE: false,
        FEATURE_NOVELTY_BOOST: false,
      });

      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Privacy features are disabled');
    });

    it('should return success response when FEATURE_PRIVACY is enabled', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Your account has been scheduled for deletion.');
    });

    it('should include deletion details in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.deletion_details).toBeDefined();
      expect(data.deletion_details.user_id).toBe('demo_user_12345');
      expect(data.deletion_details.grace_period_days).toBe(30);
      expect(data.deletion_details.requested_at).toBeDefined();
      expect(data.deletion_details.scheduled_deletion_date).toBeDefined();
    });

    it('should schedule deletion 30 days in the future', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      const scheduledDate = new Date(data.deletion_details.scheduled_deletion_date);
      const now = new Date();
      const daysDifference = Math.floor((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDifference).toBeGreaterThanOrEqual(29);
      expect(daysDifference).toBeLessThanOrEqual(30);
    });

    it('should include next steps in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(Array.isArray(data.next_steps)).toBe(true);
      expect(data.next_steps.length).toBeGreaterThan(0);
      expect(data.next_steps.some((step: string) => step.includes('30 days'))).toBe(true);
    });

    it('should include restoration instructions', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.deletion_details.restoration_instructions).toContain('Log in');
      expect(data.deletion_details.restoration_instructions).toContain('30 days');
    });

    it('should include contact email for support', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.deletion_details.contact_email).toBe('privacy@curator.example');
    });
  });

  describe('GET - Check deletion status', () => {
    it('should return 403 when FEATURE_PRIVACY is disabled', async () => {
      const { getServerFeatureFlags } = await import('@/lib/featureFlags');
      vi.mocked(getServerFeatureFlags).mockReturnValueOnce({
        FEATURE_PRIVACY: false,
        FEATURE_EMBEDDINGS: false,
        FEATURE_VECTOR_SEARCH: false,
        FEATURE_CONTEXT_ENGINE: false,
        FEATURE_NOVELTY_BOOST: false,
      });

      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Privacy features are disabled');
    });

    it('should return no pending deletion for MVP', async () => {
      const request = new NextRequest('http://localhost:3000/api/data/delete', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deletion_pending).toBe(false);
      expect(data.message).toContain('No pending deletion');
    });
  });
});
