import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRedisCache } from '../../../src/cache/redis-cache.js';

const redisMocks = vi.hoisted(() => ({
    mockGet: vi.fn(),
    mockSet: vi.fn(),
    mockSetex: vi.fn(),
    mockDel: vi.fn(),
}));

vi.mock('ioredis', () => ({
    Redis: function Redis() {
        return {
            get: redisMocks.mockGet,
            set: redisMocks.mockSet,
            setex: redisMocks.mockSetex,
            del: redisMocks.mockDel,
        };
    },
}));

describe('Redis cache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        redisMocks.mockGet.mockResolvedValue(null);
        redisMocks.mockSet.mockResolvedValue('OK');
        redisMocks.mockSetex.mockResolvedValue('OK');
        redisMocks.mockDel.mockResolvedValue(1);
    });

    it('get returns null when key not in redis', async () => {
        redisMocks.mockGet.mockResolvedValue(null);
        const cache = createRedisCache('redis://localhost');
        const result = await cache.get('mykey');
        expect(result).toBeNull();
        expect(redisMocks.mockGet).toHaveBeenCalledWith('ticketing:mykey');
    });

    it('get returns parsed JSON when redis returns string', async () => {
        redisMocks.mockGet.mockResolvedValue(JSON.stringify({ id: 'e1', name: 'Event' }));
        const cache = createRedisCache('redis://localhost');
        const result = await cache.get<{ id: string; name: string }>('events:id:e1');
        expect(result).toEqual({ id: 'e1', name: 'Event' });
    });

    it('get returns null when value is invalid JSON', async () => {
        redisMocks.mockGet.mockResolvedValue('not json {{{');
        const cache = createRedisCache('redis://localhost');
        const result = await cache.get('badkey');
        expect(result).toBeNull();
    });

    it('set uses setex when ttl > 0', async () => {
        const cache = createRedisCache('redis://localhost');
        await cache.set('key', { x: 1 }, 30);
        expect(redisMocks.mockSetex).toHaveBeenCalledWith('ticketing:key', 30, '{"x":1}');
        expect(redisMocks.mockSet).not.toHaveBeenCalled();
    });

    it('set uses set when ttl is 0', async () => {
        const cache = createRedisCache('redis://localhost');
        await cache.set('key', { x: 1 }, 0);
        expect(redisMocks.mockSet).toHaveBeenCalledWith('ticketing:key', '{"x":1}');
        expect(redisMocks.mockSetex).not.toHaveBeenCalled();
    });

    it('set uses default TTL when ttl not provided', async () => {
        const cache = createRedisCache('redis://localhost');
        await cache.set('key', 'value');
        expect(redisMocks.mockSetex).toHaveBeenCalledWith('ticketing:key', 60, '"value"');
    });

    it('del calls redis.del with prefixed key', async () => {
        const cache = createRedisCache('redis://localhost');
        await cache.del('events:list');
        expect(redisMocks.mockDel).toHaveBeenCalledWith('ticketing:events:list');
    });

    it('uses custom keyPrefix when provided', async () => {
        const cache = createRedisCache('redis://localhost', {
            keyPrefix: 'app:cache:',
        });
        await cache.get('foo');
        await cache.set('foo', 1);
        await cache.del('foo');
        expect(redisMocks.mockGet).toHaveBeenCalledWith('app:cache:foo');
        expect(redisMocks.mockSetex).toHaveBeenCalledWith('app:cache:foo', 60, '1');
        expect(redisMocks.mockDel).toHaveBeenCalledWith('app:cache:foo');
    });

    it('uses custom defaultTtlSeconds when provided', async () => {
        const cache = createRedisCache('redis://localhost', {
            defaultTtlSeconds: 120,
        });
        await cache.set('k', 'v');
        expect(redisMocks.mockSetex).toHaveBeenCalledWith('ticketing:k', 120, '"v"');
    });
});
