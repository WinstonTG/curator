import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
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

describe('/api/data/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 when FEATURE_PRIVACY is disabled', async () => {
    // Override feature flag for this test
    const { getServerFeatureFlags } = await import('@/lib/featureFlags');
    vi.mocked(getServerFeatureFlags).mockReturnValueOnce({
      FEATURE_PRIVACY: false,
      FEATURE_EMBEDDINGS: false,
      FEATURE_VECTOR_SEARCH: false,
      FEATURE_CONTEXT_ENGINE: false,
      FEATURE_NOVELTY_BOOST: false,
    });

    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Privacy features are disabled');
  });

  it('should return synthetic user data when FEATURE_PRIVACY is enabled', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('export_metadata');
    expect(data).toHaveProperty('account');
    expect(data).toHaveProperty('preferences');
    expect(data).toHaveProperty('saved_recommendations');
    expect(data).toHaveProperty('analytics_events');
  });

  it('should include proper export metadata', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.export_metadata.format_version).toBe('1.0');
    expect(data.export_metadata.user_id).toBe('demo_user_12345');
    expect(data.export_metadata.export_date).toBeDefined();
  });

  it('should include account information', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.account.email).toBe('demo@example.com');
    expect(data.account.display_name).toBe('Demo User');
    expect(data.account.oauth_providers).toContain('spotify');
    expect(data.account.oauth_providers).toContain('google');
  });

  it('should include all domain preferences', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.preferences).toHaveProperty('music');
    expect(data.preferences).toHaveProperty('news');
    expect(data.preferences).toHaveProperty('recipes');
    expect(data.preferences).toHaveProperty('learning');
    expect(data.preferences).toHaveProperty('events');
  });

  it('should include saved recommendations', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(Array.isArray(data.saved_recommendations)).toBe(true);
    expect(data.saved_recommendations.length).toBeGreaterThan(0);
    expect(data.saved_recommendations[0]).toHaveProperty('recommendation_id');
    expect(data.saved_recommendations[0]).toHaveProperty('domain');
    expect(data.saved_recommendations[0]).toHaveProperty('title');
  });

  it('should include analytics events', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(Array.isArray(data.analytics_events)).toBe(true);
    expect(data.analytics_events.length).toBeGreaterThan(0);
    expect(data.analytics_events[0]).toHaveProperty('event');
    expect(data.analytics_events[0]).toHaveProperty('timestamp');
  });

  it('should include data usage summary', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data_usage_summary).toHaveProperty('total_sessions');
    expect(data.data_usage_summary).toHaveProperty('match_discovery_rate');
    expect(data.data_usage_summary).toHaveProperty('engagement_rate');
  });

  it('should set proper Content-Disposition header for download', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/export', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('curator-data-export');
  });
});
