/**
 * Retry logic with exponential backoff
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors?: string[]; // Error names to retry
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['NetworkError', 'RateLimitError'],
};

/**
 * Execute function with retries and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  let delay = mergedConfig.initialDelay;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(lastError, mergedConfig.retryableErrors)) {
        throw lastError;
      }

      // Don't retry if we've exhausted retries
      if (attempt === mergedConfig.maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      console.warn(`Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      await sleep(delay);

      // Exponential backoff with jitter
      delay = Math.min(
        delay * mergedConfig.backoffMultiplier + Math.random() * 1000,
        mergedConfig.maxDelay
      );
    }
  }

  throw lastError!;
}

/**
 * Check if error should be retried
 */
function isRetryableError(error: Error, retryableErrors?: string[]): boolean {
  if (!retryableErrors) return true;
  return retryableErrors.includes(error.name);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private tokensPerSecond: number,
    private bucketSize: number = tokensPerSecond * 2
  ) {
    this.tokens = bucketSize;
    this.lastRefill = Date.now();
  }

  /**
   * Wait until a token is available
   */
  async acquire(): Promise<void> {
    this.refill();

    while (this.tokens < 1) {
      const waitTime = 1000 / this.tokensPerSecond;
      await sleep(waitTime);
      this.refill();
    }

    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.tokensPerSecond;

    this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
