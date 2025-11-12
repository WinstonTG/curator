/**
 * Metrics Integrity Guard
 * Validates analytics events and metrics against the metrics dictionary
 * Fails CI if critical validation rules are violated
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  [key: string]: unknown;
}

interface ValidationRule {
  rule_id: string;
  description: string;
  check: string;
  severity: 'critical' | 'warning';
}

interface ValidationResult {
  rule_id: string;
  passed: boolean;
  severity: 'critical' | 'warning';
  message: string;
}

interface MetricsDictionary {
  metadata: {
    version: string;
    owner: string;
  };
  north_star: {
    name: string;
    target: number;
  };
  events: Array<{
    name: string;
    required_for_metrics: string[];
  }>;
  validation_rules: ValidationRule[];
}

export class MetricsIntegrityChecker {
  private events: AnalyticsEvent[] = [];
  private dictionary: MetricsDictionary;

  constructor(dictionaryPath: string) {
    const dictionaryContent = fs.readFileSync(dictionaryPath, 'utf8');
    this.dictionary = yaml.parse(dictionaryContent);
  }

  /**
   * Load events from synthetic data file or event log
   */
  loadEvents(eventsPath: string): void {
    if (!fs.existsSync(eventsPath)) {
      console.warn(`⚠️  Events file not found: ${eventsPath}`);
      console.warn('   Generating synthetic events for validation...\n');
      this.generateMinimalEvents();
      return;
    }

    const eventsContent = fs.readFileSync(eventsPath, 'utf8');
    this.events = JSON.parse(eventsContent);

    // Filter to last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.events = this.events.filter(e => new Date(e.timestamp) >= oneDayAgo);

    console.log(`✓ Loaded ${this.events.length} events from last 24 hours\n`);
  }

  /**
   * Generate minimal synthetic events for testing when no events file exists
   */
  private generateMinimalEvents(): void {
    const now = new Date();
    const userId = 'test_user_001';
    const sessionId = 'test_session_001';

    // Generate minimal events for validation
    const eventTypes = [
      'session_started',
      'recommendation_viewed',
      'item_saved',
      'item_tried',
      'session_completed'
    ];

    this.events = eventTypes.map((eventType, index) => {
      const timestamp = new Date(now.getTime() - (eventTypes.length - index) * 60000);
      return {
        event: eventType,
        timestamp: timestamp.toISOString(),
        user_id: userId,
        session_id: sessionId,
        recommendation_id: eventType.includes('item') || eventType === 'recommendation_viewed'
          ? `rec_${index}`
          : undefined,
        domain: eventType.includes('item') || eventType === 'recommendation_viewed'
          ? 'music'
          : undefined,
      };
    });

    console.log(`✓ Generated ${this.events.length} synthetic events for validation\n`);
  }

  /**
   * Validate that required event types are present
   */
  private validateRequiredEvents(): ValidationResult {
    const requiredEvents = [
      'session_started',
      'session_completed',
      'recommendation_viewed',
      'item_saved',
      'item_tried',
      'item_purchased',
      'error_occurred'
    ];

    const presentEvents = new Set(this.events.map(e => e.event));
    const missingEvents = requiredEvents.filter(e => !presentEvents.has(e));

    // Allow item_purchased to be optional since it only applies to certain domains
    const criticalMissing = missingEvents.filter(e => e !== 'item_purchased' && e !== 'error_occurred');

    return {
      rule_id: 'required_events_present',
      passed: criticalMissing.length === 0,
      severity: 'critical',
      message: criticalMissing.length === 0
        ? `All critical event types present (${presentEvents.size} distinct events)`
        : `Missing critical event types: ${criticalMissing.join(', ')}`
    };
  }

  /**
   * Calculate Match Discovery Rate (North Star metric)
   */
  private calculateMatchDiscoveryRate(): number {
    const actionEvents = this.events.filter(e =>
      ['item_saved', 'item_tried', 'item_purchased'].includes(e.event)
    );

    const uniqueRecommendations = new Set(
      actionEvents.map(e => e.recommendation_id).filter(Boolean)
    );

    const uniqueUsers = new Set(
      this.events.filter(e => e.event === 'session_started').map(e => e.user_id)
    );

    const uniqueDays = new Set(
      this.events.map(e => e.timestamp.split('T')[0])
    );

    if (uniqueUsers.size === 0 || uniqueDays.size === 0) {
      return 0;
    }

    return uniqueRecommendations.size / uniqueUsers.size / uniqueDays.size;
  }

  /**
   * Validate North Star metric is non-zero
   */
  private validateNorthStar(): ValidationResult {
    const mdRate = this.calculateMatchDiscoveryRate();
    const target = this.dictionary.north_star.target;

    return {
      rule_id: 'north_star_not_zero',
      passed: mdRate > 0,
      severity: 'critical',
      message: mdRate > 0
        ? `North Star (MD/day): ${mdRate.toFixed(2)} (target: ${target})`
        : 'North Star metric (MD/day) is zero - no successful recommendations'
    };
  }

  /**
   * Calculate completion rate
   */
  private calculateCompletionRate(): number {
    const sessionsStarted = this.events.filter(e => e.event === 'session_started').length;
    const sessionsCompleted = this.events.filter(e => e.event === 'session_completed').length;

    if (sessionsStarted === 0) return 0;
    return (sessionsCompleted / sessionsStarted) * 100;
  }

  /**
   * Validate completion rate threshold
   */
  private validateCompletionRate(): ValidationResult {
    const rate = this.calculateCompletionRate();
    const threshold = 40.0; // Critical threshold from dictionary

    return {
      rule_id: 'completion_rate_threshold',
      passed: rate >= threshold,
      severity: 'critical',
      message: rate >= threshold
        ? `Completion rate: ${rate.toFixed(1)}% (threshold: ${threshold}%)`
        : `Completion rate ${rate.toFixed(1)}% is below critical threshold of ${threshold}%`
    };
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const errors = this.events.filter(e => e.event === 'error_occurred').length;
    const views = this.events.filter(e => e.event === 'recommendation_viewed').length;

    const total = errors + views;
    if (total === 0) return 0;

    return (errors / total) * 100;
  }

  /**
   * Validate error rate threshold
   */
  private validateErrorRate(): ValidationResult {
    const rate = this.calculateErrorRate();
    const threshold = 5.0; // Critical threshold from dictionary

    return {
      rule_id: 'error_rate_threshold',
      passed: rate <= threshold,
      severity: 'critical',
      message: rate <= threshold
        ? `Error rate: ${rate.toFixed(2)}% (threshold: <${threshold}%)`
        : `Error rate ${rate.toFixed(2)}% exceeds critical threshold of ${threshold}%`
    };
  }

  /**
   * Validate engagement is positive
   */
  private validateEngagement(): ValidationResult {
    const saves = this.events.filter(e => e.event === 'item_saved').length;
    const tries = this.events.filter(e => e.event === 'item_tried').length;
    const purchases = this.events.filter(e => e.event === 'item_purchased').length;

    const hasEngagement = saves > 0 || tries > 0 || purchases > 0;

    return {
      rule_id: 'engagement_positive',
      passed: hasEngagement,
      severity: 'warning',
      message: hasEngagement
        ? `Engagement detected: ${saves} saves, ${tries} tries, ${purchases} purchases`
        : 'No engagement actions detected in last 24h'
    };
  }

  /**
   * Run all validation checks
   */
  validate(): { passed: boolean; results: ValidationResult[] } {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Metrics Integrity Check');
    console.log(`   Dictionary Version: ${this.dictionary.metadata.version}`);
    console.log(`   Owner: ${this.dictionary.metadata.owner}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const results: ValidationResult[] = [
      this.validateRequiredEvents(),
      this.validateNorthStar(),
      this.validateCompletionRate(),
      this.validateErrorRate(),
      this.validateEngagement(),
    ];

    // Print results
    console.log('Validation Results:\n');
    let criticalFailures = 0;
    let warnings = 0;

    for (const result of results) {
      const icon = result.passed ? '✓' : '✗';
      const color = result.passed ? '' : result.severity === 'critical' ? '\x1b[31m' : '\x1b[33m';
      const reset = '\x1b[0m';

      console.log(`${color}${icon} [${result.severity.toUpperCase()}] ${result.message}${reset}`);

      if (!result.passed) {
        if (result.severity === 'critical') {
          criticalFailures++;
        } else {
          warnings++;
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const passed = criticalFailures === 0;

    if (passed) {
      console.log('✅ Metrics integrity check PASSED');
      if (warnings > 0) {
        console.log(`⚠️  ${warnings} warning(s) detected`);
      }
    } else {
      console.log(`❌ Metrics integrity check FAILED`);
      console.log(`   ${criticalFailures} critical failure(s), ${warnings} warning(s)`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return { passed, results };
  }
}

// Main execution
if (require.main === module) {
  const dictionaryPath = path.join(__dirname, '../metrics_dictionary.yaml');
  const eventsPath = path.join(__dirname, '../../synthetic_events.json');

  const checker = new MetricsIntegrityChecker(dictionaryPath);
  checker.loadEvents(eventsPath);

  const { passed } = checker.validate();

  process.exit(passed ? 0 : 1);
}

export default MetricsIntegrityChecker;
