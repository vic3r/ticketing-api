import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVenuesService } from '../../../src/services/venues.service.js';
import type { IVenuesRepository } from '../../../src/interfaces/venues.repository.interface.js';

describe('VenuesService', () => {
    let mockVenuesRepository: IVenuesRepository;

    beforeEach(() => {
        mockVenuesRepository = {
            create: vi.fn(),
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
});
