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

    describe('with cache', () => {
        it('findAllPublished returns cached list when cache hit', async () => {
            const cachedList = [
                {
                    id: 'c1',
                    organizerId: 'o1',
                    venueId: 'v1',
                    name: 'Cached',
                    description: null,
                    imageUrl: null,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                    status: EventStatus.Published,
                    isPublished: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];
            const mockCache = {
                get: vi.fn().mockResolvedValue(cachedList),
                set: vi.fn().mockResolvedValue(undefined),
                del: vi.fn().mockResolvedValue(undefined),
            };
            const service = createEventsService(mockEventsRepository, mockCache);
            const result = await service.findAllPublished();
            expect(result).toEqual(cachedList);
            expect(mockCache.get).toHaveBeenCalledWith('events:list:published');
            expect(mockEventsRepository.findAllPublished).not.toHaveBeenCalled();
        });

        it('findAllPublished fetches from repo and sets cache on miss', async () => {
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
            const mockCache = {
                get: vi.fn().mockResolvedValue(null),
                set: vi.fn().mockResolvedValue(undefined),
                del: vi.fn().mockResolvedValue(undefined),
            };
            const service = createEventsService(mockEventsRepository, mockCache);
            const result = await service.findAllPublished();
            expect(result).toHaveLength(1);
            expect(result[0]?.name).toBe('Concert');
            expect(mockCache.set).toHaveBeenCalledWith('events:list:published', result, 60);
        });

        it('findById returns cached event when cache hit', async () => {
            const cached = {
                id: 'e1',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'Cached Event',
                description: null,
                imageUrl: null,
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                status: EventStatus.Published,
                isPublished: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const mockCache = {
                get: vi.fn().mockResolvedValue(cached),
                set: vi.fn().mockResolvedValue(undefined),
                del: vi.fn().mockResolvedValue(undefined),
            };
            const service = createEventsService(mockEventsRepository, mockCache);
            const result = await service.findById('e1');
            expect(result).toEqual(cached);
            expect(mockCache.get).toHaveBeenCalledWith('events:id:e1');
            expect(mockEventsRepository.findById).not.toHaveBeenCalled();
        });

        it('findById fetches from repo and sets cache on miss', async () => {
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
            const mockCache = {
                get: vi.fn().mockResolvedValue(null),
                set: vi.fn().mockResolvedValue(undefined),
                del: vi.fn().mockResolvedValue(undefined),
            };
            const service = createEventsService(mockEventsRepository, mockCache);
            const result = await service.findById('e1');
            expect(result?.name).toBe('Event');
            expect(mockCache.set).toHaveBeenCalledWith('events:id:e1', result, 60);
        });

        it('create invalidates list cache', async () => {
            const created = {
                id: 'new-id',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'New',
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
            const mockCache = {
                get: vi.fn().mockResolvedValue(null),
                set: vi.fn().mockResolvedValue(undefined),
                del: vi.fn().mockResolvedValue(undefined),
            };
            const service = createEventsService(mockEventsRepository, mockCache);
            await service.create({
                venueId: 'v1',
                organizerId: 'o1',
                name: 'New',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
            });
            expect(mockCache.del).toHaveBeenCalledWith('events:list:published');
        });
    });
});
