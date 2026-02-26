import { Job, Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import type { IReservationRepository } from '../interfaces/reservation.repository.interface.js';

export function createReservationQueue(connection: ConnectionOptions): Queue<{ eventId: string; seatIds: string[] }> {
    return new Queue<{ eventId: string; seatIds: string[] }>('reservation', { connection });
}

export function createReservationWorker(
    connection: ConnectionOptions,
    reservationRepository: IReservationRepository
): Worker<{ eventId: string; seatIds: string[] }> {
    return new Worker<{ eventId: string; seatIds: string[] }>(
        'reservation',
        async (job: Job<{ eventId: string; seatIds: string[] }>) => {
            const { eventId, seatIds } = job.data;
            await reservationRepository.reserve(eventId, seatIds);
        },
        { connection }
    );
}