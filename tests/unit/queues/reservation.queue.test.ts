import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    processReservationJob,
    createReservationQueue,
    createReservationWorker,
} from '../../../src/queues/reservation.queue.js';
import type { IReservationRepository } from '../../../src/interfaces/reservation.repository.interface.js';

describe('Reservation queue', () => {
    let mockReservationRepository: IReservationRepository;

    beforeEach(() => {
        mockReservationRepository = {
            reserve: vi.fn().mockResolvedValue(undefined),
            lockSeatsForReservation: vi.fn(),
        };
    });

    describe('processReservationJob', () => {
        it('calls reservationRepository.reserve with eventId and seatIds', async () => {
            await processReservationJob(
                { eventId: 'ev-1', seatIds: ['s1', 's2'] },
                mockReservationRepository
            );

            expect(mockReservationRepository.reserve).toHaveBeenCalledWith('ev-1', ['s1', 's2']);
        });

        it('propagates errors from reserve', async () => {
            vi.mocked(mockReservationRepository.reserve).mockRejectedValue(new Error('DB error'));

            await expect(
                processReservationJob(
                    { eventId: 'ev-1', seatIds: ['s1'] },
                    mockReservationRepository
                )
            ).rejects.toThrow('DB error');
        });
    });

    describe('createReservationQueue', () => {
        it('returns a Queue instance', () => {
            const queue = createReservationQueue({ host: 'localhost', port: 6379 });
            expect(queue).toBeDefined();
            expect(queue.name).toBe('reservation');
        });
    });

    describe('createReservationWorker', () => {
        it('returns a Worker that uses processReservationJob', async () => {
            const worker = createReservationWorker(
                { host: 'localhost', port: 6379 },
                mockReservationRepository
            );
            expect(worker).toBeDefined();
            expect(worker.name).toBe('reservation');
            await worker.close();
        });
    });
});
