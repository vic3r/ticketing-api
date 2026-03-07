import { beforeEach, describe, expect, it, vi } from 'vitest';
import { venuesRepository } from '../../../src/repositories/venues.repository.js';
import { VenueCreationFailedError } from '../../../src/errors/venues.errors.js';

const mocks = vi.hoisted(() => ({
    mockReturning: vi.fn(),
    mockOrderBy: vi.fn(),
    mockLimit: vi.fn(),
}));

const insertThenable = {
    then: (r: (v: unknown) => void) => Promise.resolve(undefined).then(r),
    catch: (e: (err: unknown) => void) => Promise.resolve(undefined).catch(e),
};

vi.mock('../../../src/db/index.js', () => ({
    db: {
        select: () => ({
            from: () => ({
                orderBy: () => mocks.mockOrderBy(),
                where: () => ({ limit: () => mocks.mockLimit() }),
            }),
        }),
        insert: () => ({
            values: (v: unknown) => ({
                returning: () => mocks.mockReturning(),
                ...insertThenable,
            }),
        }),
    },
}));

vi.mock('../../../src/db/schema.js', () => ({
    venues: {},
    seats: {},
}));

describe('Venues repository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockReturning.mockResolvedValue([]);
        mocks.mockOrderBy.mockResolvedValue([]);
        mocks.mockLimit.mockResolvedValue([]);
    });

    describe('findAll', () => {
        it('returns all venues ordered by name', async () => {
            const rows = [
                {
                    id: 'v1',
                    organizerId: null,
                    name: 'Arena',
                    address: '1 St',
                    city: 'City',
                    state: 'ST',
                    zip: '123',
                    country: 'US',
                    description: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'v2',
                    organizerId: null,
                    name: 'Hall',
                    address: '2 St',
                    city: 'Town',
                    state: 'ST',
                    zip: '456',
                    country: 'US',
                    description: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            mocks.mockOrderBy.mockResolvedValueOnce(rows);

            const result = await venuesRepository.findAll();

            expect(result).toEqual(rows);
        });

        it('returns empty array when no venues', async () => {
            mocks.mockOrderBy.mockResolvedValueOnce([]);

            const result = await venuesRepository.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('returns venue when found', async () => {
            const venue = {
                id: 'v1',
                organizerId: null,
                name: 'Main Hall',
                address: '123 Main',
                city: 'City',
                state: 'ST',
                zip: '12345',
                country: 'US',
                description: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mocks.mockLimit.mockResolvedValueOnce([venue]);

            const result = await venuesRepository.findById('v1');

            expect(result).toEqual(venue);
        });

        it('returns null when not found', async () => {
            mocks.mockLimit.mockResolvedValueOnce([]);

            const result = await venuesRepository.findById('bad');

            expect(result).toBeNull();
        });
    });

    it('create returns record when insert succeeds', async () => {
        const created = {
            id: 'v1',
            organizerId: 'o1',
            name: 'Main Hall',
            address: '123 Main St',
            city: 'City',
            state: 'State',
            zip: '12345',
            country: 'Country',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mocks.mockReturning.mockResolvedValueOnce([created]);

        const result = await venuesRepository.create({
            name: 'Main Hall',
            address: '123 Main St',
            city: 'City',
            state: 'State',
            zip: '12345',
            country: 'Country',
        });

        expect(result).toEqual(created);
    });

    it('create passes organizerId and description when provided', async () => {
        const created = {
            id: 'v2',
            organizerId: 'org-1',
            name: 'Arena',
            address: '456 Oak',
            city: 'Town',
            state: 'ST',
            zip: '67890',
            country: 'US',
            description: 'Big venue',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mocks.mockReturning.mockResolvedValueOnce([created]);

        const result = await venuesRepository.create({
            organizerId: 'org-1',
            name: 'Arena',
            address: '456 Oak',
            city: 'Town',
            state: 'ST',
            zip: '67890',
            country: 'US',
            description: 'Big venue',
        });

        expect(result.organizerId).toBe('org-1');
        expect(result.description).toBe('Big venue');
    });

    it('create throws VenueCreationFailedError when insert returns empty', async () => {
        mocks.mockReturning.mockResolvedValueOnce([]);

        await expect(
            venuesRepository.create({
                name: 'X',
                address: 'A',
                city: 'C',
                state: 'S',
                zip: 'Z',
                country: 'CO',
            })
        ).rejects.toThrow(VenueCreationFailedError);
    });

    describe('addSeats', () => {
        it('returns 0 when seats array is empty', async () => {
            const result = await venuesRepository.addSeats('v1', []);
            expect(result).toBe(0);
        });

        it('returns count and inserts seats', async () => {
            const seats = [
                { section: 'A', row: '1', seatNumber: 1 },
                { section: 'A', row: '1', seatNumber: 2 },
            ];
            const result = await venuesRepository.addSeats('v1', seats);
            expect(result).toBe(2);
        });

        it('passes optional row and seatNumber as null when omitted', async () => {
            const seats = [{ section: 'Floor' }];
            const result = await venuesRepository.addSeats('v1', seats);
            expect(result).toBe(1);
        });
    });
});
