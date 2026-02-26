import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventsRepository } from '../../../src/repositories/events.repository.js';
import { EventCreationFailedError } from '../../../src/errors/events.errors.js';

const mocks = vi.hoisted(() => ({
    mockWhere: vi.fn(),
    mockFrom: vi.fn(),
    mockInnerJoin: vi.fn(),
    mockSelect: vi.fn(),
    mockReturning: vi.fn(),
    mockValues: vi.fn(),
    mockInsert: vi.fn(),
}));

vi.mock('../../../src/db/index.js', () => ({
    db: {
        select: () => mocks.mockSelect(),
        insert: () => ({
            values: (v: unknown) => {
                const noReturn = Promise.resolve(undefined);
                return {
                    returning: () => mocks.mockReturning(),
                    then: noReturn.then.bind(noReturn),
                    catch: noReturn.catch.bind(noReturn),
                };
            },
        }),
    },
}));

vi.mock('../../../src/db/schema.js', () => ({
    events: {},
    eventSeats: {},
    seats: {},
}));

describe('Events repository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockSelect.mockReturnValue({
            from: mocks.mockFrom,
        });
        mocks.mockFrom.mockReturnValue({
            where: mocks.mockWhere,
        });
        mocks.mockReturning.mockResolvedValue([]);
    });

    describe('findAllPublished', () => {
        it('returns published events', async () => {
            const rows = [
                {
                    id: 'e1',
                    organizerId: 'o1',
                    venueId: 'v1',
                    name: 'Event',
                    description: null,
                    imageUrl: null,
                    startDate: new Date(),
                    endDate: new Date(),
                    status: 'published',
                    isPublished: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            mocks.mockWhere.mockResolvedValueOnce(rows);

            const result = await eventsRepository.findAllPublished();

            expect(result).toEqual(rows);
        });

        it('returns empty array when no published events', async () => {
            mocks.mockWhere.mockResolvedValueOnce([]);

            const result = await eventsRepository.findAllPublished();

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('returns event when found', async () => {
            const row = {
                id: 'e1',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'Event',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: 'published',
                isPublished: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mocks.mockWhere.mockReturnValueOnce({
                limit: vi.fn().mockResolvedValue([row]),
            });

            const result = await eventsRepository.findById('e1');

            expect(result).toEqual(row);
        });

        it('returns null when not found', async () => {
            mocks.mockWhere.mockReturnValueOnce({
                limit: vi.fn().mockResolvedValue([]),
            });

            const result = await eventsRepository.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('throws EventCreationFailedError when insert returns empty', async () => {
            mocks.mockReturning.mockResolvedValueOnce([]);

            await expect(
                eventsRepository.create({
                    venueId: 'v1',
                    organizerId: 'o1',
                    name: 'New',
                    description: null,
                    imageUrl: null,
                    startDate: new Date(),
                    endDate: new Date(),
                })
            ).rejects.toThrow(EventCreationFailedError);
        });

        it('returns created record when insert succeeds', async () => {
            const created = {
                id: 'new-id',
                organizerId: 'o1',
                venueId: null,
                name: 'New',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: 'draft',
                isPublished: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mocks.mockReturning.mockResolvedValueOnce([created]);

            const result = await eventsRepository.create({
                venueId: '',
                organizerId: 'o1',
                name: 'New',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
            });

            expect(result).toEqual(created);
        });

        it('inserts eventSeats when record has venueId and venue has seats', async () => {
            const created = {
                id: 'ev-1',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'New',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: 'draft',
                isPublished: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mocks.mockReturning.mockResolvedValueOnce([created]);
            mocks.mockWhere.mockResolvedValueOnce([{ id: 'seat-1' }, { id: 'seat-2' }]);

            const result = await eventsRepository.create({
                venueId: 'v1',
                organizerId: 'o1',
                name: 'New',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                isPublished: true,
            });

            expect(result).toEqual(created);
            expect(mocks.mockWhere).toHaveBeenCalled();
        });
    });

    describe('findSeatsByEventId', () => {
        it('returns seats for event', async () => {
            const rows = [
                { id: 's1', section: 'A', row: '1', seatNumber: 1, status: 'available' },
                { id: 's2', section: 'A', row: '1', seatNumber: 2, status: 'reserved' },
            ];
            mocks.mockFrom.mockReturnValueOnce({
                innerJoin: mocks.mockInnerJoin,
            });
            mocks.mockInnerJoin.mockReturnValueOnce({
                where: mocks.mockWhere,
            });
            mocks.mockWhere.mockResolvedValueOnce(rows);

            const result = await eventsRepository.findSeatsByEventId('ev-1');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 's1',
                section: 'A',
                row: '1',
                seatNumber: 1,
                status: 'available',
            });
            expect(result[1]).toEqual({
                id: 's2',
                section: 'A',
                row: '1',
                seatNumber: 2,
                status: 'reserved',
            });
        });

        it('returns empty array when event has no seats', async () => {
            mocks.mockFrom.mockReturnValueOnce({
                innerJoin: mocks.mockInnerJoin,
            });
            mocks.mockInnerJoin.mockReturnValueOnce({
                where: mocks.mockWhere,
            });
            mocks.mockWhere.mockResolvedValueOnce([]);

            const result = await eventsRepository.findSeatsByEventId('ev-empty');

            expect(result).toEqual([]);
        });
    });
});
