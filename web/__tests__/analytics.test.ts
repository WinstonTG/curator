import { describe, it, expect, beforeEach } from 'vitest';
import { Analytics, Domain, ErrorType } from '../lib/analytics';

describe('Analytics', () => {
  let analytics: Analytics;

  beforeEach(() => {
    analytics = new Analytics('test_user_123');
  });

  describe('Event Tracking', () => {
    it('should track session start event', () => {
      analytics.trackSessionStart('web', { time_of_day: 'morning' });
      const events = analytics.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('session_started');
      expect(events[0].user_id).toBe('test_user_123');
      expect(events[0].platform).toBe('web');
    });

    it('should track session complete event', () => {
      analytics.trackSessionComplete(120, 3);
      const events = analytics.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('session_completed');
      expect(events[0].duration_seconds).toBe(120);
      expect(events[0].actions_taken).toBe(3);
    });

    it('should track recommendation view event', () => {
      const domain: Domain = 'music';
      analytics.trackRecommendationView('rec_123', domain, 1, 'upbeat electronic music');
      const events = analytics.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('recommendation_viewed');
      expect(events[0].recommendation_id).toBe('rec_123');
      expect(events[0].domain).toBe('music');
      expect(events[0].rank).toBe(1);
      expect(events[0].source_query).toBe('upbeat electronic music');
    });

    it('should track item save event', () => {
      const domain: Domain = 'news';
      analytics.trackItemSave('rec_456', domain, 45);
      const events = analytics.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('item_saved');
      expect(events[0].recommendation_id).toBe('rec_456');
      expect(events[0].domain).toBe('news');
      expect(events[0].time_to_action_seconds).toBe(45);
    });

    it('should track item try event', () => {
      const domain: Domain = 'recipes';
      analytics.trackItemTry('rec_789', domain, 90);
      const events = analytics.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('item_tried');
      expect(events[0].time_to_action_seconds).toBe(90);
    });

    it('should track item purchase event', () => {
      analytics.trackItemPurchase('rec_101', 'events', 60, 49.99);
      const events = analytics.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('item_purchased');
      expect(events[0].domain).toBe('events');
      expect(events[0].price_usd).toBe(49.99);
    });

    it('should track error event', () => {
      const errorType: ErrorType = 'api_failure';
      analytics.trackError(errorType, 'Spotify API timeout', 'music');
      const events = analytics.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('error_occurred');
      expect(events[0].error_type).toBe('api_failure');
      expect(events[0].error_message).toBe('Spotify API timeout');
      expect(events[0].domain).toBe('music');
    });
  });

  describe('Event Persistence', () => {
    it('should accumulate multiple events', () => {
      analytics.trackSessionStart('web');
      analytics.trackRecommendationView('rec_1', 'music', 1);
      analytics.trackItemSave('rec_1', 'music', 30);
      analytics.trackSessionComplete(120, 1);

      const events = analytics.getEvents();
      expect(events).toHaveLength(4);
    });

    it('should clear events when requested', () => {
      analytics.trackSessionStart('web');
      analytics.trackRecommendationView('rec_1', 'music', 1);

      expect(analytics.getEvents()).toHaveLength(2);

      analytics.clearEvents();

      expect(analytics.getEvents()).toHaveLength(0);
    });
  });

  describe('Timestamps', () => {
    it('should include ISO 8601 timestamps on all events', () => {
      analytics.trackSessionStart('web');
      const events = analytics.getEvents();

      expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Session Management', () => {
    it('should generate unique session IDs', () => {
      const analytics1 = new Analytics('user_1');
      const analytics2 = new Analytics('user_1');

      analytics1.trackSessionStart('web');
      analytics2.trackSessionStart('web');

      const session1 = analytics1.getEvents()[0].session_id;
      const session2 = analytics2.getEvents()[0].session_id;

      expect(session1).not.toBe(session2);
    });

    it('should maintain same session ID across events', () => {
      analytics.trackSessionStart('web');
      analytics.trackRecommendationView('rec_1', 'music', 1);
      analytics.trackSessionComplete(60, 1);

      const events = analytics.getEvents();
      const sessionIds = events.map(e => e.session_id);

      expect(new Set(sessionIds).size).toBe(1); // All same session ID
    });
  });

  describe('Domain Validation', () => {
    it('should accept all valid domain types', () => {
      const domains: Domain[] = ['music', 'news', 'recipes', 'learning', 'events'];

      domains.forEach(domain => {
        analytics.trackRecommendationView(`rec_${domain}`, domain, 1);
      });

      expect(analytics.getEvents()).toHaveLength(5);
    });
  });
});
