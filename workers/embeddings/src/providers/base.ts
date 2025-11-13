/**
 * Base embedding provider interface
 */

export type EmbeddingModel =
  | 'voyage-2' // Anthropic (via Voyage AI)
  | 'text-embedding-3-small' // OpenAI
  | 'text-embedding-3-large' // OpenAI
  | 'all-MiniLM-L6-v2'; // Local (sentence-transformers)

export interface EmbeddingConfig {
  provider: 'anthropic' | 'openai' | 'local';
  model: EmbeddingModel;
  apiKey?: string;
  dimensions?: number; // For dimensionality reduction
  batchSize?: number; // Max items per batch
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  usage?: {
    tokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
  totalTokens?: number;
}

/**
 * Base embedding provider interface
 */
export abstract class EmbeddingProvider {
  constructor(protected config: EmbeddingConfig) {}

  /**
   * Generate embedding for a single text
   */
  abstract embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts (batch)
   */
  abstract embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Get the dimensionality of embeddings from this provider
   */
  abstract getDimensions(): number;

  /**
   * Validate configuration
   */
  abstract validate(): Promise<boolean>;

  /**
   * Prepare text for embedding (truncation, cleaning)
   */
  protected prepareText(text: string, maxTokens: number = 8000): string {
    // Simple approximation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;

    // Truncate and add ellipsis
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Normalize embedding to unit vector
   */
  protected normalize(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
}
