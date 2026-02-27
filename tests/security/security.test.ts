import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { IAuthService } from '../../src/interfaces/auth.service.interface.js';
import type { IEventsService } from '../../src/interfaces/events.service.interface.js';
import type { IReservationService } from '../../src/interfaces/reservation.service.interface.js';
import type { IOrdersService } from '../../src/interfaces/orders.service.interface.js';

/**
 * Security tests: rate limiting, Helmet headers, body limit, input validation, error handling.
 */
describe('Security', () => {
    const mockAuth: IAuthService = { register: vi.fn(), login: vi.fn() };
    const mockEvents: IEventsService = {
        findAllPublished: vi.fn().mockResolvedValue([]),
        findById: vi.fn(),
        create: vi.fn(),
        getSeatsForEvent: vi.fn(),
    };
    const mockReservation: IReservationService = {
        reserve: vi.fn(),
        lockSeatsForReservation: vi.fn(),
    };
    const mockOrders: IOrdersService = { checkOut: vi.fn(), handleWebhook: vi.fn() };

    /** Default app (no rate limit overrides) for headers and input validation. */
    let app: Awaited<ReturnType<typeof buildApp>>;

    beforeAll(async () => {
        app = await buildApp({
            authService: mockAuth,
            eventsService: mockEvents,
            reservationService: mockReservation,
            ordersService: mockOrders,
        });
        await app.ready();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Rate limiting', () => {
        it('returns 429 when global rate limit exceeded', async () => {
            const limitedApp = await buildApp({
                authService: mockAuth,
                eventsService: mockEvents,
                reservationService: mockReservation,
                ordersService: mockOrders,
                rateLimitMax: 2,
                authRateLimitMax: 2,
                rateLimitKeyGenerator: () => 'security-test-global-key',
            });
            await limitedApp.ready();

            // Use /events (registered after rate-limit) so global limit applies
            const url = { method: 'GET' as const, url: '/events' };
            const r1 = await limitedApp.inject(url);
            const r2 = await limitedApp.inject(url);
            const r3 = await limitedApp.inject(url);

            expect(r1.statusCode).toBe(200);
            expect(r2.statusCode).toBe(200);
            expect(r3.statusCode).toBe(429);
            expect(r3.json()).toHaveProperty('message');
            expect((r3.json() as { message: string }).message).toMatch(/rate limit|retry after/i);

            await limitedApp.close();
        });

        it('returns 429 when auth route rate limit exceeded', async () => {
            vi.mocked(mockAuth.login).mockResolvedValue({
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                role: 'user',
            });
            const limitedApp = await buildApp({
                authService: mockAuth,
                eventsService: mockEvents,
                reservationService: mockReservation,
                ordersService: mockOrders,
                rateLimitMax: 100,
                authRateLimitMax: 2,
                rateLimitKeyGenerator: () => 'test-client',
            });
            await limitedApp.ready();

            const url = {
                method: 'POST' as const,
                url: '/auth/login',
                payload: { email: 'u@example.com', password: 'p' },
            };
            const r1 = await limitedApp.inject(url);
            const r2 = await limitedApp.inject(url);
            const r3 = await limitedApp.inject(url);

            expect(r1.statusCode).toBe(200);
            expect(r2.statusCode).toBe(200);
            expect(r3.statusCode).toBe(429);

            await limitedApp.close();
        });
    });

    describe('Security headers (Helmet)', () => {
        it('sets X-Content-Type-Options: nosniff', async () => {
            const res = await app.inject({ method: 'GET', url: '/health' });
            expect(res.headers['x-content-type-options']).toBe('nosniff');
        });

        it('sets X-XSS-Protection', async () => {
            const res = await app.inject({ method: 'GET', url: '/health' });
            expect(res.headers['x-xss-protection']).toBeDefined();
        });

        it('sets Referrer-Policy', async () => {
            const res = await app.inject({ method: 'GET', url: '/health' });
            expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        });

        it('sets Cross-Origin-Resource-Policy', async () => {
            const res = await app.inject({ method: 'GET', url: '/health' });
            expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
        });
    });

    describe('Input validation (auth)', () => {
        it('rejects register when email exceeds maxLength', async () => {
            const longEmail = 'a'.repeat(256) + '@example.com';
            const res = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: longEmail, password: 'p', name: 'N' },
            });
            expect(res.statusCode).toBe(400);
        });

        it('rejects register when name exceeds maxLength', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'a@b.com', password: 'p', name: 'N'.repeat(201) },
            });
            expect(res.statusCode).toBe(400);
        });

        it('rejects login when password exceeds maxLength', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: 'a@b.com', password: 'x'.repeat(513) },
            });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('Error handling in production', () => {
        it('returns generic message on 500 when NODE_ENV=production', async () => {
            const orig = process.env.NODE_ENV;
            Object.defineProperty(process, 'env', {
                value: { ...process.env, NODE_ENV: 'production' },
                writable: true,
            });

            const prodApp = await buildApp({
                authService: {
                    register: vi.fn().mockRejectedValue(new Error('Internal DB failure')),
                    login: vi.fn(),
                },
                eventsService: mockEvents,
                reservationService: mockReservation,
                ordersService: mockOrders,
            });
            await prodApp.ready();

            const res = await prodApp.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'u@example.com', password: 'secret', name: 'User' },
            });
            expect(res.statusCode).toBe(500);
            expect(res.json().message).toBe('An unexpected error occurred');
            expect(res.json().message).not.toContain('DB');

            await prodApp.close();
            Object.defineProperty(process, 'env', {
                value: { ...process.env, NODE_ENV: orig },
                writable: true,
            });
        });
    });
});
