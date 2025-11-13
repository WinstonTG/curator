/**
 * K-NN Sanity Tests
 * Tests vector similarity calculations
 */

import { describe, it, expect } from 'vitest';

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance (L2)
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

describe('K-NN Similarity Functions', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const v = [1, 2, 3, 4];
      const similarity = cosineSimilarity(v, v);

      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should handle normalized vectors', () => {
      // Normalized vectors at 45 degrees
      const a = [Math.sqrt(0.5), Math.sqrt(0.5), 0];
      const b = [Math.sqrt(0.5), 0, Math.sqrt(0.5)];
      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(0.5, 5);
    });

    it('should throw for vectors of different lengths', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const v = [1, 2, 3, 4];
      const distance = euclideanDistance(v, v);

      expect(distance).toBe(0);
    });

    it('should calculate distance correctly', () => {
      const a = [0, 0, 0];
      const b = [3, 4, 0];
      const distance = euclideanDistance(a, b);

      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should be symmetric', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];

      const d1 = euclideanDistance(a, b);
      const d2 = euclideanDistance(b, a);

      expect(d1).toBe(d2);
    });

    it('should throw for vectors of different lengths', () => {
      expect(() => euclideanDistance([1, 2], [1, 2, 3])).toThrow();
    });
  });

  describe('K-NN Ranking', () => {
    it('should rank similar items higher', () => {
      const query = [1, 0, 0, 0];

      const corpus = [
        { id: 'a', vector: [1, 0, 0, 0] }, // Exact match
        { id: 'b', vector: [0.9, 0.1, 0, 0] }, // Very similar
        { id: 'c', vector: [0.5, 0.5, 0, 0] }, // Somewhat similar
        { id: 'd', vector: [0, 1, 0, 0] }, // Orthogonal
      ];

      const results = corpus
        .map(item => ({
          ...item,
          similarity: cosineSimilarity(query, item.vector),
        }))
        .sort((a, b) => b.similarity - a.similarity);

      expect(results[0].id).toBe('a');
      expect(results[1].id).toBe('b');
      expect(results[2].id).toBe('c');
      expect(results[3].id).toBe('d');

      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
      expect(results[2].similarity).toBeGreaterThan(results[3].similarity);
    });

    it('should handle top-k selection', () => {
      const query = [1, 0, 0];

      const corpus = [
        { id: '1', vector: [1, 0, 0] },
        { id: '2', vector: [0.9, 0.1, 0] },
        { id: '3', vector: [0.8, 0.2, 0] },
        { id: '4', vector: [0.7, 0.3, 0] },
        { id: '5', vector: [0.6, 0.4, 0] },
      ];

      const k = 3;
      const topK = corpus
        .map(item => ({
          ...item,
          similarity: cosineSimilarity(query, item.vector),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);

      expect(topK.length).toBe(3);
      expect(topK[0].id).toBe('1');
      expect(topK[1].id).toBe('2');
      expect(topK[2].id).toBe('3');
    });
  });
});

export { cosineSimilarity, euclideanDistance };
