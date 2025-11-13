/**
 * Redis Queue for Embedding Jobs
 */

import Redis from 'ioredis';

export interface EmbeddingJob {
  itemId: string;
  text: string;
  domain: string;
  priority?: 'high' | 'normal' | 'low';
}

export class EmbeddingQueue {
  private redis: Redis;
  private queueKey: string = 'embeddings:queue';
  private processingKey: string = 'embeddings:processing';

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Add job to queue
   */
  async enqueue(job: EmbeddingJob): Promise<void> {
    const priority = job.priority || 'normal';
    const score = this.getPriorityScore(priority);

    await this.redis.zadd(this.queueKey, score, JSON.stringify(job));
  }

  /**
   * Add multiple jobs to queue
   */
  async enqueueBatch(jobs: EmbeddingJob[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const job of jobs) {
      const priority = job.priority || 'normal';
      const score = this.getPriorityScore(priority);
      pipeline.zadd(this.queueKey, score, JSON.stringify(job));
    }

    await pipeline.exec();
  }

  /**
   * Dequeue next job (with score)
   */
  async dequeue(): Promise<EmbeddingJob | null> {
    // Get lowest score (highest priority)
    const results = await this.redis.zpopmin(this.queueKey);

    if (!results || results.length === 0) {
      return null;
    }

    const jobData = results[0];
    const job: EmbeddingJob = JSON.parse(jobData);

    // Add to processing set
    await this.redis.sadd(this.processingKey, job.itemId);

    return job;
  }

  /**
   * Dequeue multiple jobs
   */
  async dequeueBatch(count: number): Promise<EmbeddingJob[]> {
    const jobs: EmbeddingJob[] = [];

    for (let i = 0; i < count; i++) {
      const job = await this.dequeue();
      if (!job) break;
      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Mark job as complete
   */
  async complete(itemId: string): Promise<void> {
    await this.redis.srem(this.processingKey, itemId);
  }

  /**
   * Requeue failed job
   */
  async requeue(job: EmbeddingJob): Promise<void> {
    await this.redis.srem(this.processingKey, job.itemId);
    await this.enqueue(job);
  }

  /**
   * Get queue size
   */
  async size(): Promise<number> {
    return await this.redis.zcard(this.queueKey);
  }

  /**
   * Get processing count
   */
  async processingCount(): Promise<number> {
    return await this.redis.scard(this.processingKey);
  }

  /**
   * Clear queue (for testing)
   */
  async clear(): Promise<void> {
    await this.redis.del(this.queueKey);
    await this.redis.del(this.processingKey);
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Get priority score (lower = higher priority)
   */
  private getPriorityScore(priority: 'high' | 'normal' | 'low'): number {
    const now = Date.now();
    switch (priority) {
      case 'high':
        return now - 1000000; // Process first
      case 'normal':
        return now;
      case 'low':
        return now + 1000000; // Process last
      default:
        return now;
    }
  }
}
