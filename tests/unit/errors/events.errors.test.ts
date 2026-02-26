import { describe, expect, it } from 'vitest';
import { EventCreationFailedError, EventNotFoundError } from '../../../src/errors/events.errors.js';

describe('Events errors', () => {
    it('EventCreationFailedError has default message and name', () => {
        const err = new EventCreationFailedError();
        expect(err.message).toBe('Failed to create event');
        expect(err.name).toBe('EventCreationFailedError');
        expect(err).toBeInstanceOf(Error);
    });

    it('EventCreationFailedError accepts custom message', () => {
        const err = new EventCreationFailedError('DB insert failed');
        expect(err.message).toBe('DB insert failed');
    });

    it('EventNotFoundError has default message and name', () => {
        const err = new EventNotFoundError();
        expect(err.message).toBe('Event not found');
        expect(err.name).toBe('EventNotFoundError');
        expect(err).toBeInstanceOf(Error);
    });

    it('EventNotFoundError accepts custom message', () => {
        const err = new EventNotFoundError('Event id xyz not found');
        expect(err.message).toBe('Event id xyz not found');
    });
});
