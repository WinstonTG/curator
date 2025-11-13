/**
 * Local Embedding Provider (Mock)
 * For development/testing without external API calls
 * In production, this would use sentence-transformers via Python subprocess
 */

import { EmbeddingProvider, type EmbeddingConfig, type EmbeddingResult, type BatchEmbeddingResult } from './base';

export class LocalProvider extends EmbeddingProvider {
  private dimensions: number = 384; // all-MiniLM-L6-v2 dimensions

  async embed(text: string): Promise<EmbeddingResult> {
    // Generate deterministic mock embedding based on text
    const embedding = this.generateMockEmbedding(text);

    return {
      embedding,
      model: 'all-MiniLM-L6-v2',
      dimensions: this.dimensions,
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const embeddings = texts.map(text => this.generateMockEmbedding(text));

    return {
      embeddings,
      model: 'all-MiniLM-L6-v2',
      dimensions: this.dimensions,
    };
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async validate(): Promise<boolean> {
    return true; // Always valid for local provider
  }

  /**
   * Generate deterministic mock embedding
   * Uses simple hash-based approach for testing
   */
  private generateMockEmbedding(text: string): number[] {
    const embedding = new Array(this.dimensions).fill(0);

    // Simple hash to make embeddings deterministic but varied
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Use hash to seed random-like values
    for (let i = 0; i < this.dimensions; i++) {
      // Linear congruential generator for deterministic "randomness"
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      embedding[i] = (hash / 0x7fffffff) * 2 - 1; // Range [-1, 1]
    }

    return this.normalize(embedding);
  }
}
