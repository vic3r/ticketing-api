import { describe, expect, it } from 'vitest';
import { EVENTS_LIST_KEY, eventByIdKey } from '../../../src/cache/events-cache.keys.js';

describe('Events cache keys', () => {
    it('EVENTS_LIST_KEY is defined', () => {
        expect(EVENTS_LIST_KEY).toBe('events:list:published');
    });

    it('eventByIdKey returns key with id', () => {
        expect(eventByIdKey('e1')).toBe('events:id:e1');
        expect(eventByIdKey('550e8400-e29b-41d4-a716-446655440000')).toBe(
            'events:id:550e8400-e29b-41d4-a716-446655440000'
        );
    });
});
