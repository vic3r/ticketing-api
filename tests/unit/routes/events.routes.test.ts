import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../../src/app.js';
import type { IEventsService } from '../../../src/interfaces/events.service.interface.js';
import { EventStatus } from '../../../src/enums/event-status.js';
import { EventCreationFailedError } from '../../../src/errors/events.errors.js';

describe('Events routes', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    let mockEventsService: IEventsService;

    beforeEach(async () => {
        mockEventsService = {
            findAllPublished: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
        };
        app = buildApp({ eventsService: mockEventsService });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });

    describe('GET /events', () => {
        it('returns 200 and list of events (happy path)', async () => {
            vi.mocked(mockEventsService.findAllPublished).mockResolvedValue([
                {
                    id: 'e1',
                    organizerId: 'o1',
                    venueId: 'v1',
                    name: 'Concert',
                    description: null,
                    imageUrl: null,
                    startDate: new Date(),
                    endDate: new Date(),
                    status: EventStatus.Published,
                    isPublished: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);
            const res = await app.inject({ method: 'GET', url: '/events' });
            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(Array.isArray(body)).toBe(true);
            expect(body[0]?.name).toBe('Concert');
        });

        it('returns 200 and empty array when no events', async () => {
            vi.mocked(mockEventsService.findAllPublished).mockResolvedValue([]);
            const res = await app.inject({ method: 'GET', url: '/events' });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toEqual([]);
        });
    });

    describe('GET /events/:id', () => {
        it('returns 200 and event (happy path)', async () => {
            const event = {
                id: 'e1',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'Event',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: EventStatus.Published,
                isPublished: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            vi.mocked(mockEventsService.findById).mockResolvedValue(event);
            const res = await app.inject({ method: 'GET', url: '/events/e1' });
            expect(res.statusCode).toBe(200);
            expect(res.json().name).toBe('Event');
        });

        it('returns 404 when event not found', async () => {
            vi.mocked(mockEventsService.findById).mockResolvedValue(null as never);
            const res = await app.inject({ method: 'GET', url: '/events/nonexistent' });
            expect(res.statusCode).toBe(404);
            expect(res.json()).toMatchObject({ message: 'Event not found' });
        });
    });

    describe('POST /events', () => {
        it('returns 201 and created event (happy path)', async () => {
            const created = {
                id: 'new',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'New',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: EventStatus.Draft,
                isPublished: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            vi.mocked(mockEventsService.create).mockResolvedValue(created);
            const token = app.jwt.sign(
                { userId: 'o1', email: 'o@o.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/events',
                payload: {
                    venueId: 'v1',
                    organizerId: 'o1',
                    name: 'New',
                    description: null,
                    imageUrl: null,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(201);
            expect(res.json().name).toBe('New');
        });

        it('returns 401 when no auth header', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/events',
                payload: {
                    venueId: 'v1',
                    organizerId: 'o1',
                    name: 'New',
                    description: null,
                    imageUrl: null,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                },
            });
            expect(res.statusCode).toBe(401);
        });

        it('returns 403 when user is not admin', async () => {
            const token = app.jwt.sign(
                { userId: 'u1', email: 'u@u.com', role: 'user' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/events',
                payload: {
                    venueId: 'v1',
                    organizerId: 'o1',
                    name: 'New',
                    description: null,
                    imageUrl: null,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(403);
            expect(res.json()).toMatchObject({ message: 'Admin access required' });
        });

        it('returns 500 when EventCreationFailedError', async () => {
            vi.mocked(mockEventsService.create).mockRejectedValue(new EventCreationFailedError());
            const token = app.jwt.sign(
                { userId: 'o1', email: 'o@o.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/events',
                payload: {
                    venueId: 'v1',
                    organizerId: 'o1',
                    name: 'New',
                    description: null,
                    imageUrl: null,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(500);
        });
    });
});
