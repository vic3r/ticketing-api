import { Job, Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import type { IReservationRepository } from '../interfaces/reservation.repository.interface.js';

export type ReservationJobData = { eventId: string; seatIds: string[] };

/** Process one reservation job. Used by worker and tests. */
export async function processReservationJob(
    data: ReservationJobData,
    reservationRepository: IReservationRepository
): Promise<void> {
    const { eventId, seatIds } = data;
    await reservationRepository.reserve(eventId, seatIds);
}

export function createReservationQueue(connection: ConnectionOptions): Queue<ReservationJobData> {
    return new Queue<ReservationJobData>('reservation', { connection });
}

export function createReservationWorker(
    connection: ConnectionOptions,
    reservationRepository: IReservationRepository
): Worker<ReservationJobData> {
    return new Worker<ReservationJobData>(
        'reservation',
        async (job: Job<ReservationJobData>) => {
            await processReservationJob(job.data, reservationRepository);
        },
        { connection }
    );
}
