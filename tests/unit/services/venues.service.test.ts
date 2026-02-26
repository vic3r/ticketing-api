import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVenuesService } from '../../../src/services/venues.service.js';
import type { IVenuesRepository } from '../../../src/interfaces/venues.repository.interface.js';

describe('VenuesService', () => {
    let mockVenuesRepository: IVenuesRepository;

    beforeEach(() => {
        mockVenuesRepository = {
            create: vi.fn(),
            addSeats: vi.fn(),
        };
    });

    it('create returns mapped venue (happy path)', async () => {
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
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
        };
        vi.mocked(mockVenuesRepository.create).mockResolvedValue(created);
        const service = createVenuesService(mockVenuesRepository);
        const result = await service.create({
            name: 'Main Hall',
            address: '123 Main St',
            city: 'City',
            state: 'State',
            zip: '12345',
            country: 'Country',
        });
        expect(result.id).toBe('v1');
        expect(result.name).toBe('Main Hall');
        expect(result.createdAt).toEqual(created.createdAt);
    });

    it('create maps string dates to Date objects', async () => {
        const created = {
            id: 'v2',
            organizerId: null,
            name: 'Arena',
            address: '456 Oak',
            city: 'Town',
            state: 'ST',
            zip: '67890',
            country: 'US',
            description: 'Big venue',
            createdAt: '2025-02-01T00:00:00.000Z',
            updatedAt: '2025-02-01T00:00:00.000Z',
        };
        vi.mocked(mockVenuesRepository.create).mockResolvedValue(created);
        const service = createVenuesService(mockVenuesRepository);
        const result = await service.create({
            name: 'Arena',
            address: '456 Oak',
            city: 'Town',
            state: 'ST',
            zip: '67890',
            country: 'US',
        });
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
        expect(result.description).toBe('Big venue');
    });

    describe('addSeats', () => {
        it('returns count from repository', async () => {
            vi.mocked(mockVenuesRepository.addSeats).mockResolvedValue(3);
            const service = createVenuesService(mockVenuesRepository);
            const result = await service.addSeats('v1', {
                seats: [
                    { section: 'A', row: '1', seatNumber: 1 },
                    { section: 'A', row: '1', seatNumber: 2 },
                    { section: 'A', row: '2', seatNumber: 1 },
                ],
            });
            expect(result).toEqual({ count: 3 });
            expect(mockVenuesRepository.addSeats).toHaveBeenCalledWith('v1', [
                { section: 'A', row: '1', seatNumber: 1 },
                { section: 'A', row: '1', seatNumber: 2 },
                { section: 'A', row: '2', seatNumber: 1 },
            ]);
        });

        it('passes empty seats array and returns count 0', async () => {
            vi.mocked(mockVenuesRepository.addSeats).mockResolvedValue(0);
            const service = createVenuesService(mockVenuesRepository);
            const result = await service.addSeats('v1', { seats: [] });
            expect(result).toEqual({ count: 0 });
            expect(mockVenuesRepository.addSeats).toHaveBeenCalledWith('v1', []);
        });
    });
});
