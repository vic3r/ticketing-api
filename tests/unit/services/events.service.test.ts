import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventsService } from '../../../src/services/events.service.js';
import type { IEventsRepository } from '../../../src/interfaces/events.repository.interface.js';
import { EventStatus } from '../../../src/enums/event-status.js';

describe('EventsService', () => {
    let mockEventsRepository: IEventsRepository;

    beforeEach(() => {
        mockEventsRepository = {
            findAllPublished: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
        };
    });

    describe('findAllPublished', () => {
        it('returns mapped events (happy path)', async () => {
            const dbRecords = [
                {
                    id: 'e1',
                    organizerId: 'o1',
                    venueId: 'v1',
                    name: 'Concert',
                    description: null,
                    imageUrl: null,
                    startDate: new Date(),
                    endDate: new Date(),
                    status: 'published' as const,
                    isPublished: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            vi.mocked(mockEventsRepository.findAllPublished).mockResolvedValue(dbRecords);
            const service = createEventsService(mockEventsRepository);
            const result = await service.findAllPublished();
            expect(result).toHaveLength(1);
            expect(result[0]?.name).toBe('Concert');
            expect(result[0]?.status).toBe(EventStatus.Published);
        });

        it('returns empty array when no published events', async () => {
            vi.mocked(mockEventsRepository.findAllPublished).mockResolvedValue([]);
            const service = createEventsService(mockEventsRepository);
            const result = await service.findAllPublished();
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('returns mapped event (happy path)', async () => {
            const record = {
                id: 'e1',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'Event',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: 'published' as const,
                isPublished: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            vi.mocked(mockEventsRepository.findById).mockResolvedValue(record);
            const service = createEventsService(mockEventsRepository);
            const result = await service.findById('e1');
            expect(result.id).toBe('e1');
            expect(result.name).toBe('Event');
        });
    });

    describe('create', () => {
        it('returns created event (happy path)', async () => {
            const created = {
                id: 'new-id',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'New Event',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: 'draft' as const,
                isPublished: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            vi.mocked(mockEventsRepository.create).mockResolvedValue(created);
            const service = createEventsService(mockEventsRepository);
            const result = await service.create({
                venueId: 'v1',
                organizerId: 'o1',
                name: 'New Event',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
            });
            expect(result.name).toBe('New Event');
            expect(mockEventsRepository.create).toHaveBeenCalledOnce();
        });
    });
});
