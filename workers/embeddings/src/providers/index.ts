/**
 * Embedding Provider Factory
 */

import type { EmbeddingConfig } from './base';
import { EmbeddingProvider } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { LocalProvider } from './local';

export * from './base';
export { OpenAIProvider, AnthropicProvider, LocalProvider };

/**
 * Create embedding provider from configuration
 */
export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'local':
      return new LocalProvider(config);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

/**
 * Get provider from environment
 */
export function getProviderFromEnv(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local') as 'openai' | 'anthropic' | 'local';

  const config: EmbeddingConfig = {
    provider,
    model: getModelForProvider(provider),
    apiKey: getApiKeyForProvider(provider),
    batchSize: 100,
  };

  return createEmbeddingProvider(config);
}

function getModelForProvider(provider: string): any {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    case 'anthropic':
      return 'voyage-2';
    case 'local':
      return 'all-MiniLM-L6-v2';
    default:
      return 'all-MiniLM-L6-v2';
  }
}

function getApiKeyForProvider(provider: string): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.VOYAGE_API_KEY;
    default:
      return undefined;
  }
}
