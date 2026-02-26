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
        };
        app = buildApp({ venuesService: mockVenuesService });
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
    });
});
