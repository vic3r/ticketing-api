import { Redis } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';

/**
 * Creates a Redis connection for BullMQ (queues/workers).
 * Use this single connection when calling createReservationQueue and createReservationWorker.
 */
export function createQueueConnection(): ConnectionOptions {
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
    });
    return redis as ConnectionOptions;
}
