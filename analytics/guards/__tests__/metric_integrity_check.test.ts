import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import MetricsIntegrityChecker from '../metric_integrity_check';

describe('MetricsIntegrityChecker', () => {
  const dictionaryPath = path.join(__dirname, '../../metrics_dictionary.yaml');
  let checker: MetricsIntegrityChecker;

  beforeEach(() => {
    checker = new MetricsIntegrityChecker(dictionaryPath);
  });

  describe('Initialization', () => {
    it('should load metrics dictionary successfully', () => {
      expect(checker).toBeDefined();
    });

    it('should generate minimal events when no file exists', () => {
      checker.loadEvents('/nonexistent/path');
      const result = checker.validate();
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(5);
    });
  });

  describe('Event Validation', () => {
    it('should pass validation with complete event set', () => {
      // Create temp events file
      const tempEvents = [
        { event: 'session_started', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1' },
        { event: 'recommendation_viewed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', rank: 1 },
        { event: 'item_saved', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', time_to_action_seconds: 30 },
        { event: 'session_completed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', duration_seconds: 120, actions_taken: 1 },
      ];

      const tempPath = path.join(__dirname, 'temp_events.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      expect(result.passed).toBe(true);
      expect(result.results.every(r => r.passed || r.severity === 'warning')).toBe(true);
    });

    it('should detect missing critical events', () => {
      // Only include some events
      const tempEvents = [
        { event: 'session_started', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1' },
      ];

      const tempPath = path.join(__dirname, 'temp_events_incomplete.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      const requiredEventsCheck = result.results.find(r => r.rule_id === 'required_events_present');
      expect(requiredEventsCheck).toBeDefined();
    });
  });

  describe('North Star Metric', () => {
    it('should calculate MD/day correctly', () => {
      const now = new Date();
      const tempEvents = [
        { event: 'session_started', timestamp: now.toISOString(), user_id: 'user1', session_id: 'sess1' },
        { event: 'recommendation_viewed', timestamp: now.toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', rank: 1 },
        { event: 'item_saved', timestamp: now.toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', time_to_action_seconds: 30 },
        { event: 'recommendation_viewed', timestamp: now.toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec2', domain: 'music', rank: 2 },
        { event: 'item_tried', timestamp: now.toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec2', domain: 'music', time_to_action_seconds: 60 },
        { event: 'session_completed', timestamp: now.toISOString(), user_id: 'user1', session_id: 'sess1', duration_seconds: 120, actions_taken: 2 },
      ];

      const tempPath = path.join(__dirname, 'temp_events_north_star.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      const northStarCheck = result.results.find(r => r.rule_id === 'north_star_not_zero');
      expect(northStarCheck).toBeDefined();
      expect(northStarCheck!.passed).toBe(true);
    });

    it('should fail when MD/day is zero', () => {
      const tempEvents = [
        { event: 'session_started', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1' },
        { event: 'recommendation_viewed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', rank: 1 },
        // No actions taken
      ];

      const tempPath = path.join(__dirname, 'temp_events_no_actions.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      const northStarCheck = result.results.find(r => r.rule_id === 'north_star_not_zero');
      expect(northStarCheck).toBeDefined();
      expect(northStarCheck!.passed).toBe(false);
      expect(northStarCheck!.severity).toBe('critical');
    });
  });

  describe('Completion Rate', () => {
    it('should calculate completion rate correctly', () => {
      const tempEvents = [
        { event: 'session_started', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1' },
        { event: 'session_started', timestamp: new Date().toISOString(), user_id: 'user2', session_id: 'sess2' },
        { event: 'session_completed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', duration_seconds: 120, actions_taken: 1 },
        // user2 did not complete
      ];

      const tempPath = path.join(__dirname, 'temp_events_completion.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      const completionCheck = result.results.find(r => r.rule_id === 'completion_rate_threshold');
      expect(completionCheck).toBeDefined();
      // 1 completed out of 2 started = 50%
      expect(completionCheck!.message).toContain('50');
    });
  });

  describe('Error Rate', () => {
    it('should calculate error rate correctly', () => {
      const tempEvents = [
        { event: 'recommendation_viewed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', rank: 1 },
        { event: 'recommendation_viewed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec2', domain: 'music', rank: 2 },
        { event: 'error_occurred', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', error_type: 'api_failure', error_message: 'Test error' },
      ];

      const tempPath = path.join(__dirname, 'temp_events_errors.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      const errorRateCheck = result.results.find(r => r.rule_id === 'error_rate_threshold');
      expect(errorRateCheck).toBeDefined();
      // 1 error out of 3 total (2 views + 1 error) = 33%
      expect(errorRateCheck!.passed).toBe(false); // Should be above 5% threshold
    });
  });

  describe('Engagement Validation', () => {
    it('should detect positive engagement', () => {
      const tempEvents = [
        { event: 'recommendation_viewed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', rank: 1 },
        { event: 'item_saved', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', time_to_action_seconds: 30 },
      ];

      const tempPath = path.join(__dirname, 'temp_events_engagement.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      const engagementCheck = result.results.find(r => r.rule_id === 'engagement_positive');
      expect(engagementCheck).toBeDefined();
      expect(engagementCheck!.passed).toBe(true);
    });

    it('should warn when no engagement detected', () => {
      const tempEvents = [
        { event: 'session_started', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1' },
        { event: 'recommendation_viewed', timestamp: new Date().toISOString(), user_id: 'user1', session_id: 'sess1', recommendation_id: 'rec1', domain: 'music', rank: 1 },
      ];

      const tempPath = path.join(__dirname, 'temp_events_no_engagement.json');
      fs.writeFileSync(tempPath, JSON.stringify(tempEvents));

      checker.loadEvents(tempPath);
      const result = checker.validate();

      fs.unlinkSync(tempPath);

      const engagementCheck = result.results.find(r => r.rule_id === 'engagement_positive');
      expect(engagementCheck).toBeDefined();
      expect(engagementCheck!.passed).toBe(false);
      expect(engagementCheck!.severity).toBe('warning');
    });
  });
});
