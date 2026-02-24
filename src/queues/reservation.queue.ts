import { Job, Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import type { IReservationRepository } from '../interfaces/reservation.repository.interface.js';

export function createReservationQueue(connection: ConnectionOptions): Queue {
    return new Queue('reservation', { connection });
}

export function createReservationWorker(
    connection: ConnectionOptions,
    reservationRepository: IReservationRepository
): Worker<{ seatIds: string[] }> {
    return new Worker<{ seatIds: string[] }>(
        'reservation',
        async (job: Job<{ seatIds: string[] }>) => {
            const { seatIds } = job.data;
            await reservationRepository.reserve(seatIds);
        },
        { connection }
    );
}