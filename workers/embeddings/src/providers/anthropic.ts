/**
 * Anthropic Embedding Provider (via Voyage AI)
 * Note: Anthropic doesn't have native embeddings, so we use Voyage AI which is recommended
 */

import { EmbeddingProvider, type EmbeddingConfig, type EmbeddingResult, type BatchEmbeddingResult } from './base';

export class AnthropicProvider extends EmbeddingProvider {
  private dimensions: number = 1024; // Voyage-2 dimensions

  constructor(config: EmbeddingConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('Voyage AI API key is required');
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const preparedText = this.prepareText(text);

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        input: [preparedText],
        model: 'voyage-2',
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      embedding: data.data[0].embedding,
      model: 'voyage-2',
      dimensions: this.dimensions,
      usage: {
        tokens: data.usage?.total_tokens || 0,
      },
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const batchSize = this.config.batchSize || 128;
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    for (const batch of batches) {
      const preparedTexts = batch.map(text => this.prepareText(text));

      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          input: preparedTexts,
          model: 'voyage-2',
        }),
      });

      if (!response.ok) {
        throw new Error(`Voyage API error: ${response.status}`);
      }

      const data = await response.json();
      allEmbeddings.push(...data.data.map((d: any) => d.embedding));
      totalTokens += data.usage?.total_tokens || 0;
    }

    return {
      embeddings: allEmbeddings,
      model: 'voyage-2',
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
