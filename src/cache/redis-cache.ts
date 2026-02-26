import { Redis } from 'ioredis';
import type { ICache } from './cache.interface.js';

const KEY_PREFIX = 'ticketing:';
const DEFAULT_TTL_SECONDS = 60;

export function createRedisCache(
    redisUrl: string,
    options?: { keyPrefix?: string; defaultTtlSeconds?: number }
): ICache {
    const prefix = options?.keyPrefix ?? KEY_PREFIX;
    const defaultTtl = options?.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

    return {
        async get<T>(key: string): Promise<T | null> {
            const raw = await redis.get(prefix + key);
            if (raw == null) return null;
            try {
                return JSON.parse(raw) as T;
            } catch {
                return null;
            }
        },
        async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
            const k = prefix + key;
            const ttl = ttlSeconds ?? defaultTtl;
            const serialized = JSON.stringify(value);
            if (ttl > 0) {
                await redis.setex(k, ttl, serialized);
            } else {
                await redis.set(k, serialized);
            }
        },
        async del(key: string): Promise<void> {
            await redis.del(prefix + key);
        },
    };
}
