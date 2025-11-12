/**
 * Analytics Event Tracking Library
 * Implements events from analytics/metrics_dictionary.yaml
 */

export type Domain = 'music' | 'news' | 'recipes' | 'learning' | 'events';
export type ErrorType = 'api_failure' | 'timeout' | 'rate_limit' | 'validation_error' | 'unknown';

interface BaseEvent {
  timestamp: string;
  user_id?: string;
  session_id?: string;
}

export interface SessionStartedEvent extends BaseEvent {
  event: 'session_started';
  platform: 'web' | 'mobile';
  context?: {
    time_of_day?: string;
    weather?: string;
    location?: string;
  };
}

export interface SessionCompletedEvent extends BaseEvent {
  event: 'session_completed';
  duration_seconds: number;
  actions_taken: number;
}

export interface RecommendationViewedEvent extends BaseEvent {
  event: 'recommendation_viewed';
  recommendation_id: string;
  domain: Domain;
  rank: number;
  source_query?: string;
}

export interface ItemSavedEvent extends BaseEvent {
  event: 'item_saved';
  recommendation_id: string;
  domain: Domain;
  time_to_action_seconds: number;
}

export interface ItemTriedEvent extends BaseEvent {
  event: 'item_tried';
  recommendation_id: string;
  domain: Domain;
  time_to_action_seconds: number;
}

export interface ItemPurchasedEvent extends BaseEvent {
  event: 'item_purchased';
  recommendation_id: string;
  domain: 'learning' | 'events';
  time_to_action_seconds: number;
  price_usd?: number;
}

export interface ErrorOccurredEvent extends BaseEvent {
  event: 'error_occurred';
  error_type: ErrorType;
  error_message: string;
  domain?: Domain;
}

export type AnalyticsEvent =
  | SessionStartedEvent
  | SessionCompletedEvent
  | RecommendationViewedEvent
  | ItemSavedEvent
  | ItemTriedEvent
  | ItemPurchasedEvent
  | ErrorOccurredEvent;

/**
 * Event tracker class
 */
export class Analytics {
  private userId?: string;
  private sessionId?: string;
  private events: AnalyticsEvent[] = [];

  constructor(userId?: string) {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    // Store event locally (in production, this would POST to /api/analytics/track)
    this.events.push(event);

    if (typeof window !== 'undefined') {
      console.log('[Analytics]', event.event, event);
      // In production: await fetch('/api/analytics/track', { method: 'POST', body: JSON.stringify(event) })
    }
  }

  trackSessionStart(platform: 'web' | 'mobile' = 'web', context?: SessionStartedEvent['context']): void {
    this.sendEvent({
      event: 'session_started',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      platform,
      context,
    });
  }

  trackSessionComplete(durationSeconds: number, actionsTaken: number): void {
    this.sendEvent({
      event: 'session_completed',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      duration_seconds: durationSeconds,
      actions_taken: actionsTaken,
    });
  }

  trackRecommendationView(
    recommendationId: string,
    domain: Domain,
    rank: number,
    sourceQuery?: string
  ): void {
    this.sendEvent({
      event: 'recommendation_viewed',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      recommendation_id: recommendationId,
      domain,
      rank,
      source_query: sourceQuery,
    });
  }

  trackItemSave(recommendationId: string, domain: Domain, timeToActionSeconds: number): void {
    this.sendEvent({
      event: 'item_saved',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      recommendation_id: recommendationId,
      domain,
      time_to_action_seconds: timeToActionSeconds,
    });
  }

  trackItemTry(recommendationId: string, domain: Domain, timeToActionSeconds: number): void {
    this.sendEvent({
      event: 'item_tried',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      recommendation_id: recommendationId,
      domain,
      time_to_action_seconds: timeToActionSeconds,
    });
  }

  trackItemPurchase(
    recommendationId: string,
    domain: 'learning' | 'events',
    timeToActionSeconds: number,
    priceUsd?: number
  ): void {
    this.sendEvent({
      event: 'item_purchased',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      recommendation_id: recommendationId,
      domain,
      time_to_action_seconds: timeToActionSeconds,
      price_usd: priceUsd,
    });
  }

  trackError(errorType: ErrorType, errorMessage: string, domain?: Domain): void {
    this.sendEvent({
      event: 'error_occurred',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      error_type: errorType,
      error_message: errorMessage,
      domain,
    });
  }

  getEvents(): AnalyticsEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Singleton instance for client-side usage
let analyticsInstance: Analytics | null = null;

export function getAnalytics(userId?: string): Analytics {
  if (!analyticsInstance) {
    analyticsInstance = new Analytics(userId);
  }
  return analyticsInstance;
}
