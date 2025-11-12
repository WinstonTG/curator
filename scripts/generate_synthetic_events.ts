/**
 * Synthetic Event Generator for Local Development
 * Generates realistic analytics events for testing the metrics dashboard
 */

type Domain = 'music' | 'news' | 'recipes' | 'learning' | 'events';
type ErrorType = 'api_failure' | 'timeout' | 'rate_limit' | 'validation_error' | 'unknown';

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  user_id: string;
  session_id: string;
  [key: string]: unknown;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUserId(): string {
  return `user_${randomInt(1000, 9999)}`;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateRecommendationId(domain: Domain): string {
  return `${domain}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

class EventGenerator {
  private users: string[] = [];
  private domains: Domain[] = ['music', 'news', 'recipes', 'learning', 'events'];
  private events: AnalyticsEvent[] = [];

  constructor(numUsers: number = 100) {
    // Generate user pool
    for (let i = 0; i < numUsers; i++) {
      this.users.push(generateUserId());
    }
  }

  generateSessionEvents(
    userId: string,
    date: Date,
    actionsPerSession: number = randomInt(1, 5)
  ): void {
    const sessionId = generateSessionId();
    const sessionStart = new Date(date);
    sessionStart.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59));

    // Session start
    this.events.push({
      event: 'session_started',
      timestamp: sessionStart.toISOString(),
      user_id: userId,
      session_id: sessionId,
      platform: Math.random() > 0.1 ? 'web' : 'mobile',
      context: {
        time_of_day: sessionStart.getHours() < 12 ? 'morning' : sessionStart.getHours() < 18 ? 'afternoon' : 'evening',
      },
    });

    const domain = randomChoice(this.domains);
    let viewTime = new Date(sessionStart.getTime() + 2000); // 2s after session start

    // Generate recommendation views and actions
    for (let i = 0; i < actionsPerSession; i++) {
      const recommendationId = generateRecommendationId(domain);

      // Recommendation view
      this.events.push({
        event: 'recommendation_viewed',
        timestamp: viewTime.toISOString(),
        user_id: userId,
        session_id: sessionId,
        recommendation_id: recommendationId,
        domain,
        rank: i + 1,
      });

      // 70% chance of taking action
      if (Math.random() < 0.7) {
        const actionTime = new Date(viewTime.getTime() + randomInt(5000, 180000)); // 5s to 3min
        const timeToAction = Math.floor((actionTime.getTime() - viewTime.getTime()) / 1000);

        // Determine action type
        const actionRoll = Math.random();
        if (actionRoll < 0.6) {
          // Save (60% of actions)
          this.events.push({
            event: 'item_saved',
            timestamp: actionTime.toISOString(),
            user_id: userId,
            session_id: sessionId,
            recommendation_id: recommendationId,
            domain,
            time_to_action_seconds: timeToAction,
          });
        } else if (actionRoll < 0.9) {
          // Try (30% of actions)
          this.events.push({
            event: 'item_tried',
            timestamp: actionTime.toISOString(),
            user_id: userId,
            session_id: sessionId,
            recommendation_id: recommendationId,
            domain,
            time_to_action_seconds: timeToAction,
          });
        } else if (domain === 'learning' || domain === 'events') {
          // Purchase (10% of actions, only for learning/events)
          this.events.push({
            event: 'item_purchased',
            timestamp: actionTime.toISOString(),
            user_id: userId,
            session_id: sessionId,
            recommendation_id: recommendationId,
            domain,
            time_to_action_seconds: timeToAction,
            price_usd: randomInt(10, 200),
          });
        }

        viewTime = new Date(actionTime.getTime() + 5000); // 5s between actions
      } else {
        viewTime = new Date(viewTime.getTime() + randomInt(3000, 15000)); // 3-15s between views
      }
    }

    // Session complete (60% completion rate)
    if (Math.random() < 0.6) {
      const sessionEnd = new Date(viewTime.getTime() + 1000);
      const durationSeconds = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);

      this.events.push({
        event: 'session_completed',
        timestamp: sessionEnd.toISOString(),
        user_id: userId,
        session_id: sessionId,
        duration_seconds: durationSeconds,
        actions_taken: actionsPerSession,
      });
    }

    // Random errors (1% rate)
    if (Math.random() < 0.01) {
      const errorTime = new Date(viewTime.getTime() + randomInt(0, 60000));
      this.events.push({
        event: 'error_occurred',
        timestamp: errorTime.toISOString(),
        user_id: userId,
        session_id: sessionId,
        error_type: randomChoice<ErrorType>(['api_failure', 'timeout', 'rate_limit', 'validation_error', 'unknown']),
        error_message: 'Synthetic error for testing',
        domain,
      });
    }
  }

  generate(days: number = 30): AnalyticsEvent[] {
    this.events = [];
    const endDate = new Date();

    for (let day = 0; day < days; day++) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - (days - day - 1));

      // 70% of users are active on any given day
      const activeUsers = this.users.filter(() => Math.random() < 0.7);

      for (const userId of activeUsers) {
        // Each active user has 1-3 sessions per day
        const sessionsPerDay = randomInt(1, 3);
        for (let session = 0; session < sessionsPerDay; session++) {
          this.generateSessionEvents(userId, date);
        }
      }
    }

    return this.events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  printSummary(): void {
    const summary = {
      total_events: this.events.length,
      unique_users: new Set(this.events.map(e => e.user_id)).size,
      unique_sessions: new Set(this.events.map(e => e.session_id)).size,
      event_types: {} as Record<string, number>,
    };

    for (const event of this.events) {
      summary.event_types[event.event] = (summary.event_types[event.event] || 0) + 1;
    }

    console.log('\n📊 Synthetic Event Generation Summary\n');
    console.log(`Total Events: ${summary.total_events}`);
    console.log(`Unique Users: ${summary.unique_users}`);
    console.log(`Unique Sessions: ${summary.unique_sessions}`);
    console.log('\nEvent Distribution:');
    for (const [eventType, count] of Object.entries(summary.event_types)) {
      console.log(`  ${eventType}: ${count}`);
    }
    console.log('\n');
  }

  exportToJSON(filename: string = 'synthetic_events.json'): void {
    const fs = require('fs');
    const path = require('path');

    const outputPath = path.join(process.cwd(), '..', filename);
    fs.writeFileSync(outputPath, JSON.stringify(this.events, null, 2));
    console.log(`✅ Events exported to: ${outputPath}`);
  }
}

// Main execution
if (require.main === module) {
  const generator = new EventGenerator(100); // 100 users
  const events = generator.generate(30); // 30 days of data

  generator.printSummary();
  generator.exportToJSON();

  console.log('💡 Usage: Import these events into your analytics system for testing');
  console.log('   Or use them to seed a database for the metrics dashboard');
}

export { EventGenerator };
