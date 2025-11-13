/**
 * OpenAI Embedding Provider
 */

import OpenAI from 'openai';
import { EmbeddingProvider, type EmbeddingConfig, type EmbeddingResult, type BatchEmbeddingResult } from './base';

export class OpenAIProvider extends EmbeddingProvider {
  private client: OpenAI;
  private dimensions: number;

  constructor(config: EmbeddingConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({ apiKey: config.apiKey });

    // Set dimensions based on model
    if (config.model === 'text-embedding-3-small') {
      this.dimensions = config.dimensions || 1536;
    } else if (config.model === 'text-embedding-3-large') {
      this.dimensions = config.dimensions || 3072;
    } else {
      this.dimensions = 1536; // Default
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const preparedText = this.prepareText(text);

    const response = await this.client.embeddings.create({
      model: this.config.model,
      input: preparedText,
      dimensions: this.dimensions,
    });

    return {
      embedding: response.data[0].embedding,
      model: this.config.model,
      dimensions: this.dimensions,
      usage: {
        tokens: response.usage.total_tokens,
      },
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const batchSize = this.config.batchSize || 100;
    const batches: string[][] = [];

    // Split into batches
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    // Process batches
    for (const batch of batches) {
      const preparedTexts = batch.map(text => this.prepareText(text));

      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: preparedTexts,
        dimensions: this.dimensions,
      });

      allEmbeddings.push(...response.data.map(d => d.embedding));
      totalTokens += response.usage.total_tokens;
    }

    return {
      embeddings: allEmbeddings,
      model: this.config.model,
      dimensions: this.dimensions,
      totalTokens,
    };
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async validate(): Promise<boolean> {
    try {
      await this.embed('test');
      return true;
    } catch {
      return false;
    }
  }
}
