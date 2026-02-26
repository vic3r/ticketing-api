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
        app = await buildApp({ reservationService: mockReservationService });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });

    const validEventId = '550e8400-e29b-41d4-a716-446655440000';
    const validSeatId = '550e8400-e29b-41d4-a716-446655440001';
    const validSeatId2 = '550e8400-e29b-41d4-a716-446655440002';

    function validToken() {
        return app.jwt.sign({ userId: 'user-1', email: 'u@example.com' }, { expiresIn: '7d' });
    }

    describe('POST /reservations', () => {
        it('returns 200 and seats (happy path)', async () => {
            vi.mocked(mockReservationService.lockSeatsForReservation).mockResolvedValue([
                { id: validSeatId, section: 'A', row: '1', seatNumber: 1, status: 'reserved' },
            ]);
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId: validEventId, seatIds: [validSeatId, validSeatId2] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toHaveProperty('seats');
            expect(res.json().seats).toHaveLength(1);
        });

        it('returns 400 when eventId missing', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { seatIds: [validSeatId] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(400);
            expect(res.json()).toMatchObject({ message: 'eventId is required' });
        });

        it('returns 401 when no auth header', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId: validEventId, seatIds: [validSeatId] },
            });
            expect(res.statusCode).toBe(401);
        });

        it('returns 400 when seatIds missing', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId: validEventId },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(400);
            expect(res.json()).toMatchObject({ message: expect.stringContaining('Seat IDs') });
        });

        it('returns 400 when seatIds not array of strings', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId: validEventId, seatIds: [123, 456] },
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
                payload: { eventId: validEventId, seatIds: [validSeatId] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(409);
            expect(res.json()).toMatchObject({ message: 'Seats already reserved' });
        });

        it('returns 500 when service throws generic error', async () => {
            vi.mocked(mockReservationService.lockSeatsForReservation).mockRejectedValue(
                new Error('Queue error')
            );
            const res = await app.inject({
                method: 'POST',
                url: '/reservations',
                payload: { eventId: validEventId, seatIds: [validSeatId] },
                headers: { authorization: `Bearer ${validToken()}` },
            });
            expect(res.statusCode).toBe(500);
        });
    });
});
