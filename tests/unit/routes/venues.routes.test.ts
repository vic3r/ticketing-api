import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../../src/app.js';
import type { IVenuesService } from '../../../src/interfaces/venues.service.interface.js';
import { VenueCreationFailedError } from '../../../src/errors/venues.errors.js';

describe('Venues routes', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    let mockVenuesService: IVenuesService;

    beforeEach(async () => {
        mockVenuesService = {
            create: vi.fn(),
            addSeats: vi.fn(),
        };
        app = await buildApp({ venuesService: mockVenuesService });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });

    describe('POST /venues', () => {
        const venuePayload = {
            name: 'Main Hall',
            address: '123 Main St',
            city: 'City',
            state: 'State',
            zip: '12345',
            country: 'Country',
            description: 'Main venue',
        };

        it('returns 201 and created venue (happy path)', async () => {
            const created = {
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
            vi.mocked(mockVenuesService.create).mockResolvedValue(created);
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues',
                payload: venuePayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(201);
            expect(res.json().name).toBe('Main Hall');
            expect(res.json().id).toBe('v1');
        });

        it('returns 401 when no auth header', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/venues',
                payload: venuePayload,
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
                url: '/venues',
                payload: venuePayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(403);
            expect(res.json()).toMatchObject({ message: 'Admin access required' });
        });

        it('returns 500 when VenueCreationFailedError', async () => {
            vi.mocked(mockVenuesService.create).mockRejectedValue(new VenueCreationFailedError());
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues',
                payload: venuePayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(500);
        });

        it('returns 400 when create throws generic Error', async () => {
            vi.mocked(mockVenuesService.create).mockRejectedValue(new Error('Invalid address'));
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues',
                payload: venuePayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(400);
            expect(res.json()).toMatchObject({ message: 'Invalid address' });
        });

        it('returns 500 when create throws non-Error', async () => {
            vi.mocked(mockVenuesService.create).mockRejectedValue('unknown');
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues',
                payload: venuePayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(500);
            expect(res.json()).toMatchObject({ message: 'An unknown error occurred' });
        });
    });

    describe('POST /venues/:venueId/seats', () => {
        const seatsPayload = {
            seats: [
                { section: 'A', row: '1', seatNumber: 1 },
                { section: 'A', row: '1', seatNumber: 2 },
            ],
        };

        it('returns 201 and count (happy path)', async () => {
            vi.mocked(mockVenuesService.addSeats).mockResolvedValue({ count: 2 });
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues/v1/seats',
                payload: seatsPayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(201);
            expect(res.json()).toEqual({ count: 2 });
            expect(mockVenuesService.addSeats).toHaveBeenCalledWith('v1', seatsPayload);
        });

        it('returns 401 when no auth header', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/venues/v1/seats',
                payload: seatsPayload,
            });
            expect(res.statusCode).toBe(401);
            expect(mockVenuesService.addSeats).not.toHaveBeenCalled();
        });

        it('returns 403 when user is not admin', async () => {
            const token = app.jwt.sign(
                { userId: 'u1', email: 'u@u.com', role: 'user' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues/v1/seats',
                payload: seatsPayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(403);
            expect(res.json()).toMatchObject({ message: 'Admin access required' });
            expect(mockVenuesService.addSeats).not.toHaveBeenCalled();
        });

        it('returns 400 when addSeats throws Error', async () => {
            vi.mocked(mockVenuesService.addSeats).mockRejectedValue(new Error('Venue not found'));
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues/v1/seats',
                payload: seatsPayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(400);
            expect(res.json()).toMatchObject({ message: 'Venue not found' });
        });

        it('returns 500 when addSeats throws non-Error', async () => {
            vi.mocked(mockVenuesService.addSeats).mockRejectedValue('unknown');
            const token = app.jwt.sign(
                { userId: 'a1', email: 'admin@example.com', role: 'admin' },
                { expiresIn: '7d' }
            );
            const res = await app.inject({
                method: 'POST',
                url: '/venues/v1/seats',
                payload: seatsPayload,
                headers: { authorization: `Bearer ${token}` },
            });
            expect(res.statusCode).toBe(500);
            expect(res.json()).toMatchObject({ message: 'An unknown error occurred' });
        });
    });
});
