import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../../src/app.js';
import type { IReservationService } from '../../../src/interfaces/reservation.service.interface.js';
import { ReservationConflictError } from '../../../src/errors/reservation.errors.js';

describe('Reservations routes', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    let mockReservationService: IReservationService;

    beforeEach(async () => {
        mockReservationService = {
            lockSeatsForReservation: vi.fn(),
        };
        app = buildApp({ reservationService: mockReservationService });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });

    function validToken() {
        return app.jwt.sign({ userId: 'user-1', email: 'u@example.com' }, { expiresIn: '7d' });
    }

    describe('POST /reservations', () => {
        it('returns 200 and seats (happy path)', async () => {
            vi.mocked(mockReservationService.lockSeatsForReservation).mockResolvedValue([
                { seatId: 's1', reservationId: 'r1', expiresAt: new Date() },
            ]);
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { seatIds: ['s1', 's2'] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toHaveProperty('seats');
            expect(res.json().seats).toHaveLength(1);
        });

        it('returns 401 when no auth header', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { seatIds: ['s1'] },
            });
            expect(res.statusCode).toBe(401);
        });

        it('returns 400 when seatIds missing', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: {},
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(400);
            expect(res.json()).toMatchObject({ message: expect.stringContaining('Seat IDs') });
        });

        it('returns 400 when seatIds not array of strings', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { seatIds: [123, 456] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(400);
        });

        it('returns 409 when ReservationConflictError', async () => {
            vi.mocked(mockReservationService.lockSeatsForReservation).mockRejectedValue(
                new ReservationConflictError('Seats already reserved')
            );
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { seatIds: ['s1'] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(409);
            expect(res.json()).toMatchObject({ message: 'Seats already reserved' });
        });

        it('returns 500 when service throws generic error', async () => {
            vi.mocked(mockReservationService.lockSeatsForReservation).mockRejectedValue(new Error('Queue error'));
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { seatIds: ['s1'] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(500);
        });
    });
});
