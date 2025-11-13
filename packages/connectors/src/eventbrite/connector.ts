/**
 * Eventbrite API Connector (for Events)
 */

import type { Connector, ConnectorConfig, FetchResult, ConnectorHealth } from '../base/types';
import type { Item } from '@curator/types/src/item';
import { AuthenticationError, NetworkError, MappingError } from '../base/errors';

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string | null };
  url: string;
  start: { utc: string; local: string };
  end: { utc: string; local: string };
  venue?: {
    name: string;
    address: {
      city: string;
      region: string;
      country: string;
      localized_address_display: string;
      latitude: string;
      longitude: string;
    };
  };
  logo: { url: string } | null;
  capacity: number | null;
  is_free: boolean;
  ticket_availability: {
    has_available_tickets: boolean;
  };
  category: {
    name: string;
  };
  organizer?: {
    name: string;
  };
}

interface EventbriteSearchResponse {
  events: EventbriteEvent[];
  pagination: {
    page_number: number;
    page_count: number;
    has_more_items: boolean;
    object_count: number;
  };
}

export class EventbriteConnector implements Connector<EventbriteEvent> {
  readonly source = 'eventbrite' as const;
  private baseUrl = 'https://www.eventbriteapi.com/v3';

  constructor(public readonly config: ConnectorConfig) {
    if (!config.apiKey) {
      throw new Error('Eventbrite API requires apiKey (OAuth token)');
    }
  }

  async fetch(cursor?: string, limit: number = 20): Promise<FetchResult<EventbriteEvent>> {
    const page = cursor ? parseInt(cursor) : 1;
    const params = new URLSearchParams({
      'location.address': 'San Francisco',
      'location.within': '50mi',
      'start_date.range_start': new Date().toISOString(),
      'expand': 'venue,organizer',
      'page': page.toString(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/events/search/?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (response.status === 401) {
        throw new AuthenticationError(this.source, 'Invalid OAuth token');
      }
      if (!response.ok) {
        throw new NetworkError(this.source, `API error: ${response.status}`);
      }

      const data: EventbriteSearchResponse = await response.json();
      return {
        items: data.events,
        nextCursor: data.pagination.has_more_items ? (page + 1).toString() : undefined,
        total: data.pagination.object_count,
        hasMore: data.pagination.has_more_items,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new NetworkError(this.source, 'Request failed', error as Error);
    }
  }

  map(event: EventbriteEvent): Item {
    try {
      const eventType = this.mapEventType(event.category?.name || 'other');

      return {
        id: `eventbrite-${event.id}`,
        domain: 'events',
        title: event.name.text,
        description: event.description?.text || undefined,
        source: {
          name: 'Eventbrite',
          id: event.id,
          url: event.url,
          reputation_score: 80,
        },
        embeddings: undefined,
        topics: [event.category?.name || 'event', 'events'],
        actions: ['save', 'attend'],
        sponsored: false,
        created_at: new Date().toISOString(),
        meta: {
          domain: 'events',
          organizer: event.organizer?.name || 'Unknown',
          type: eventType,
          event_date: event.start.utc,
          event_end_date: event.end.utc,
          venue: event.venue?.name || 'Online',
          location: {
            city: event.venue?.address.city || 'Online',
            state: event.venue?.address.region,
            country: event.venue?.address.country || 'US',
            address: event.venue?.address.localized_address_display,
            coordinates: event.venue?.address.latitude && event.venue?.address.longitude ? {
              lat: parseFloat(event.venue.address.latitude),
              lng: parseFloat(event.venue.address.longitude),
            } : undefined,
          },
          price_range: event.is_free ? { min: 0, max: 0 } : undefined,
          tickets_available: event.ticket_availability?.has_available_tickets,
          capacity: event.capacity || undefined,
          age_restriction: undefined,
          image_url: event.logo?.url,
        },
      };
    } catch (error) {
      throw new MappingError(this.source, event.id, 'Failed to map event', error as Error);
    }
  }

  private mapEventType(category: string): 'concert' | 'meetup' | 'workshop' | 'conference' | 'festival' | 'sports' | 'other' {
    const lower = category.toLowerCase();
    if (lower.includes('music') || lower.includes('concert')) return 'concert';
    if (lower.includes('meetup') || lower.includes('networking')) return 'meetup';
    if (lower.includes('workshop') || lower.includes('training')) return 'workshop';
    if (lower.includes('conference') || lower.includes('summit')) return 'conference';
    if (lower.includes('festival')) return 'festival';
    if (lower.includes('sports')) return 'sports';
    return 'other';
  }

  async validateAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me/`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<ConnectorHealth> {
    const startTime = Date.now();
    try {
      const isHealthy = await this.validateAuth();
      return {
        source: this.source,
        healthy: isHealthy,
        lastCheck: new Date().toISOString(),
        latency: Date.now() - startTime,
        errorRate: 0,
      };
    } catch (error) {
      return {
        source: this.source,
        healthy: false,
        lastCheck: new Date().toISOString(),
        latency: Date.now() - startTime,
        details: (error as Error).message,
      };
    }
  }
}
