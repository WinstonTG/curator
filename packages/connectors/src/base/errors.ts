/**
 * Custom error classes for connectors
 */

import type { ConnectorSource } from './types';

/**
 * Base connector error
 */
export class ConnectorError extends Error {
  constructor(
    public readonly source: ConnectorSource,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ConnectorError {
  constructor(source: ConnectorSource, message: string = 'Authentication failed') {
    super(source, message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ConnectorError {
  constructor(
    source: ConnectorSource,
    public readonly retryAfter?: number // seconds
  ) {
    super(source, `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`);
    this.name = 'RateLimitError';
  }
}

/**
 * Mapping error
 */
export class MappingError extends ConnectorError {
  constructor(
    source: ConnectorSource,
    public readonly itemId: string,
    message: string,
    originalError?: Error
  ) {
    super(source, `Failed to map item ${itemId}: ${message}`, originalError);
    this.name = 'MappingError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends ConnectorError {
  constructor(
    source: ConnectorSource,
    public readonly itemId: string,
    public readonly validationErrors: any[]
  ) {
    super(source, `Schema validation failed for item ${itemId}`);
    this.name = 'ValidationError';
  }
}

/**
 * Network error
 */
export class NetworkError extends ConnectorError {
  constructor(
    source: ConnectorSource,
    message: string = 'Network request failed',
    originalError?: Error
  ) {
    super(source, message, originalError);
    this.name = 'NetworkError';
  }
}
