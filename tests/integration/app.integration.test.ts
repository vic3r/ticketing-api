import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { IAuthService } from '../../src/interfaces/auth.service.interface.js';
import type { IEventsService } from '../../src/interfaces/events.service.interface.js';
import type { IVenuesService } from '../../src/interfaces/venues.service.interface.js';
import type { IReservationService } from '../../src/interfaces/reservation.service.interface.js';
import type { IOrdersService } from '../../src/interfaces/orders.service.interface.js';
import {
    EmailAlreadyRegisteredError,
    InvalidEmailOrPasswordError,
} from '../../src/errors/auth.errors.js';
import { EventStatus } from '../../src/enums/event-status.js';
import { ReservationConflictError } from '../../src/errors/reservation.errors.js';
import { SeatsNotFoundError } from '../../src/errors/orders.errors.js';

describe('App integration', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    let mockAuthService: IAuthService;
    let mockEventsService: IEventsService;
    let mockVenuesService: IVenuesService;
    let mockReservationService: IReservationService;
    let mockOrdersService: IOrdersService;

    beforeEach(async () => {
        mockAuthService = {
            register: vi.fn(),
            login: vi.fn(),
        };
        mockEventsService = {
            findAllPublished: vi.fn().mockResolvedValue([]),
            findById: vi.fn(),
            create: vi.fn(),
        };
        mockVenuesService = {
            create: vi.fn(),
        };
        mockReservationService = {
            lockSeatsForReservation: vi.fn(),
        };
        mockOrdersService = {
            checkOut: vi.fn(),
            handleWebhook: vi.fn(),
        };
        app = buildApp({
            authService: mockAuthService,
            eventsService: mockEventsService,
            venuesService: mockVenuesService,
            reservationService: mockReservationService,
            ordersService: mockOrdersService,
        });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });

    describe('health', () => {
        it('GET /health returns 200 and status ok', async () => {
            const res = await app.inject({ method: 'GET', url: '/health' });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toEqual({ status: 'ok' });
        });
    });

    describe('auth flow', () => {
        it('register then login (happy path)', async () => {
            vi.mocked(mockAuthService.register).mockResolvedValue({
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                role: 'user',
            });
            const reg = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'u@example.com', password: 'secret', name: 'User' },
            });
            expect(reg.statusCode).toBe(201);
            expect(reg.json()).toHaveProperty('token');
            expect(reg.json().user.email).toBe('u@example.com');

            vi.mocked(mockAuthService.login).mockResolvedValue({
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                role: 'user',
            });
            const login = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: 'u@example.com', password: 'secret' },
            });
            expect(login.statusCode).toBe(200);
            expect(login.json()).toHaveProperty('token');
        });

        it('register returns 400 when email already taken', async () => {
            vi.mocked(mockAuthService.register).mockRejectedValue(
                new EmailAlreadyRegisteredError()
            );
            const res = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'taken@example.com', password: 'p', name: 'X' },
            });
            expect(res.statusCode).toBe(400);
        });

        it('login returns 401 when invalid credentials', async () => {
            vi.mocked(mockAuthService.login).mockRejectedValue(new InvalidEmailOrPasswordError());
            const res = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: 'u@example.com', password: 'wrong' },
            });
            expect(res.statusCode).toBe(401);
        });
    });

    describe('events', () => {
        it('GET /events returns 200 and list', async () => {
            const res = await app.inject({ method: 'GET', url: '/events' });
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.json())).toBe(true);
        });

        it('GET /events/:id returns 404 when not found', async () => {
            vi.mocked(mockEventsService.findById).mockResolvedValue(null as never);
            const res = await app.inject({ method: 'GET', url: '/events/nonexistent' });
            expect(res.statusCode).toBe(404);
        });

        it('POST /events returns 401 without token', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/events',
                payload: {
                    venueId: 'v1',
                    organizerId: 'o1',
                    name: 'E',
                    description: null,
                    imageUrl: null,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                },
            });
            expect(res.statusCode).toBe(401);
        });

        it('POST /events returns 201 with valid token', async () => {
            const event = {
                id: 'e1',
                organizerId: 'o1',
                venueId: 'v1',
                name: 'Event',
                description: null,
                imageUrl: null,
                startDate: new Date(),
                endDate: new Date(),
                status: EventStatus.Draft,
                isPublished: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            vi.mocked(mockEventsService.create).mockResolvedValue(event);
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
                    name: 'Event',
                    description: null,
                    imageUrl: null,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(201);
            expect(res.json().name).toBe('Event');
        });
    });

    describe('venues', () => {
        it('POST /venues returns 201 with admin token', async () => {
            const venue = {
                id: 'v1',
                organizerId: null,
                name: 'Main Hall',
                address: '123 Main St',
                city: 'City',
                state: 'State',
                zip: '12345',
                country: 'Country',
                description: 'Main venue',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            vi.mocked(mockVenuesService.create).mockResolvedValue(venue);
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues',
                payload: {
                    name: 'Main Hall',
                    address: '123 Main St',
                    city: 'City',
                    state: 'State',
                    zip: '12345',
                    country: 'Country',
                    description: 'Main venue',
                },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(201);
            expect(res.json().name).toBe('Main Hall');
        });

        it('POST /venues returns 403 with user token', async () => {
            const token = app.jwt.sign(
                { userId: 'u1', email: 'u@u.com', role: 'user' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues',
                payload: {
                    name: 'Main Hall',
                    address: '123 Main St',
                    city: 'City',
                    state: 'State',
                    zip: '12345',
                    country: 'Country',
                },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(403);
            expect(res.json()).toMatchObject({ message: 'Admin access required' });
        });
    });

    describe('reservations', () => {
        it('POST /reservations returns 401 without token', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId: 'e1', seatIds: ['550e8400-e29b-41d4-a716-446655440001'] },
            });
            expect(res.statusCode).toBe(401);
        });

        it('POST /reservations returns 400 when eventId missing', async () => {
            const token = app.jwt.sign({ userId: 'u1', email: 'u@u.com' }, { expiresIn: '7d' });
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { seatIds: ['550e8400-e29b-41d4-a716-446655440001'] },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(400);
        });

        it('POST /reservations returns 400 when seatIds invalid', async () => {
            const token = app.jwt.sign({ userId: 'u1', email: 'u@u.com' }, { expiresIn: '7d' });
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId: '550e8400-e29b-41d4-a716-446655440000' },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(400);
        });

        it('POST /reservations returns 200 and seats with valid token (happy path)', async () => {
            const eventId = '550e8400-e29b-41d4-a716-446655440000';
            const seatId = '550e8400-e29b-41d4-a716-446655440001';
            vi.mocked(mockReservationService.lockSeatsForReservation).mockResolvedValue([
                { id: seatId, section: 'A', row: '1', seatNumber: 1, status: 'reserved' },
            ]);
            const token = app.jwt.sign({ userId: 'u1', email: 'u@u.com' }, { expiresIn: '7d' });
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId, seatIds: [seatId] },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(200);
            expect(res.json().seats).toHaveLength(1);
        });

        it('POST /reservations returns 409 on conflict', async () => {
            const eventId = '550e8400-e29b-41d4-a716-446655440000';
            const seatId = '550e8400-e29b-41d4-a716-446655440001';
            vi.mocked(mockReservationService.lockSeatsForReservation).mockRejectedValue(
                new ReservationConflictError()
            );
            const token = app.jwt.sign({ userId: 'u1', email: 'u@u.com' }, { expiresIn: '7d' });
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId, seatIds: [seatId] },
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(409);
        });
    });

    describe('orders', () => {
        it('POST /orders/checkout returns 200 (happy path)', async () => {
            vi.mocked(mockOrdersService.checkOut).mockResolvedValue({
                clientSecret: 'secret_xxx',
                orderId: 'ord_1',
            });
            const res = await app.inject({
                method: 'POST',
                url: '/orders/checkout',
                payload: { userId: 'u1', eventId: 'e1', seatIds: ['s1'], email: 'u@example.com' },
            });
            expect(res.statusCode).toBe(200);
            expect(res.json().orderId).toBe('ord_1');
        });

        it('POST /orders/checkout returns 404 when seats not found', async () => {
            vi.mocked(mockOrdersService.checkOut).mockRejectedValue(new SeatsNotFoundError());
            const res = await app.inject({
                method: 'POST',
                url: '/orders/checkout',
                payload: {
                    userId: 'u1',
                    eventId: 'e1',
                    seatIds: ['missing'],
                    email: 'u@example.com',
                },
            });
            expect(res.statusCode).toBe(404);
        });

        it('POST /orders/webhook returns 200 when handled', async () => {
            vi.mocked(mockOrdersService.handleWebhook).mockResolvedValue({ received: true });
            const res = await app.inject({
                method: 'POST',
                url: '/orders/webhook',
                payload: { type: 'payment_intent.succeeded' },
                headers: { 'stripe-signature': 'sig' },
            });
            expect(res.statusCode).toBe(200);
        });
    });
});
