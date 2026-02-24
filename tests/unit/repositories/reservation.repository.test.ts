import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReservationRepository } from '../../../src/repositories/reservation.repository.js';
import type { IReservationQueue } from '../../../src/interfaces/reservation-queue.interface.js';
import { ReservationConflictError } from '../../../src/errors/reservation.errors.js';
import { SeatStatus } from '../../../src/enums/seat-status.js';

const RESERVATION_DURATION_MS = 10 * 60 * 1000;

const mockLockedSeats = [
    { id: 's1', section: 'A', row: '1', seatNumber: 1, status: SeatStatus.Available },
    { id: 's2', section: 'A', row: '1', seatNumber: 2, status: SeatStatus.Available },
];

vi.mock('../../../src/db/index.js', () => ({
    db: {
        transaction: vi.fn(),
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
            }),
        }),
    },
}));

describe('Reservation repository', () => {
    let mockQueue: IReservationQueue;
    let repo: ReturnType<typeof createReservationRepository>;
    let db: { transaction: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        vi.resetModules();
        const dbModule = await import('../../../src/db/index.js');
        db = dbModule.db as { transaction: ReturnType<typeof vi.fn> };

        mockQueue = {
            add: vi.fn().mockResolvedValue(undefined),
        };

        repo = createReservationRepository(mockQueue);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('lockSeatsForReservation', () => {
        it('returns reserved seats and adds job to queue when all seats locked (happy path)', async () => {
            db.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
                const mockTx = {
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                for: vi.fn().mockResolvedValue(mockLockedSeats),
                            }),
                        }),
                    }),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue(undefined),
                        }),
                    }),
                };
                return fn(mockTx);
            });

            const result = await repo.lockSeatsForReservation('user-1', ['s1', 's2']);

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({ id: 's1', section: 'A', row: '1', seatNumber: 1 });
            expect(mockQueue.add).toHaveBeenCalledWith(
                'reservation',
                { seatIds: ['s1', 's2'] },
                { delay: RESERVATION_DURATION_MS }
            );
        });

        it('throws ReservationConflictError when locked count does not match requested', async () => {
            db.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
                const mockTx = {
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                for: vi.fn().mockResolvedValue([mockLockedSeats[0]]), // only one seat
                            }),
                        }),
                    }),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
                    }),
                };
                return fn(mockTx);
            });

            await expect(repo.lockSeatsForReservation('user-1', ['s1', 's2'])).rejects.toThrow(
                ReservationConflictError
            );
            expect(mockQueue.add).not.toHaveBeenCalled();
        });

        it('does not call queue.add when transaction throws', async () => {
            db.transaction.mockRejectedValue(new Error('DB error'));

            await expect(repo.lockSeatsForReservation('user-1', ['s1'])).rejects.toThrow('DB error');
            expect(mockQueue.add).not.toHaveBeenCalled();
        });
    });

    describe('reserve', () => {
        it('calls db.update for each seatId', async () => {
            const dbModule = await import('../../../src/db/index.js');
            const dbUpdate = dbModule.db.update as ReturnType<typeof vi.fn>;

            await repo.reserve(['s1', 's2']);

            expect(dbUpdate).toHaveBeenCalledTimes(2);
        });
    });
});
