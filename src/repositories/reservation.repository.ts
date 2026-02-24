import { db } from '../db/index.js';
import { seats } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import type { ReservedSeatResponse } from '../dto/reservation.dto.js';
import type { IReservationQueue } from '../interfaces/reservation-queue.interface.js';
import type { IReservationRepository } from '../interfaces/reservation.repository.interface.js';

const RESERVATION_DURATION_MINUTES = 10;

export class ReservationConflictError extends Error {
    constructor(message = 'One or more seats are not available') {
        super(message);
        this.name = 'ReservationConflictError';
    }
}

function toReservedSeatResponse(seat: {
    id: string;
    section: string;
    row: string | null;
    seatNumber: number | null;
    status: string | null;
}): ReservedSeatResponse {
    return {
        id: seat.id,
        section: seat.section,
        row: seat.row,
        seatNumber: seat.seatNumber,
        status: seat.status ?? 'reserved',
    };
}

export function createReservationRepository(
    reservationQueue: IReservationQueue
): IReservationRepository {
    return {
        async reserve(seatIds: string[]): Promise<void> {
            for (const seatId of seatIds) {
                await db
                    .update(seats)
                    .set({ status: 'available', reservedUntil: null })
                    .where(eq(seats.id, seatId));
            }
        },
        async lockSeatsForReservation(
            _userId: string,
            seatIds: string[]
        ): Promise<ReservedSeatResponse[]> {
            const reservedSeats = await db.transaction(async (tx) => {
                const locked = await tx
                    .select()
                    .from(seats)
                    .where(
                        and(
                            inArray(seats.id, seatIds),
                            eq(seats.status, 'available')
                        )
                    )
                    .for('update', { skipLocked: true });

                if (locked.length !== seatIds.length) {
                    throw new ReservationConflictError();
                }

                const reservedUntil = new Date(
                    Date.now() + RESERVATION_DURATION_MINUTES * 60 * 1000
                );
                await tx
                    .update(seats)
                    .set({ status: 'reserved', reservedUntil })
                    .where(inArray(seats.id, seatIds));

                return locked.map(toReservedSeatResponse);
            });

            await reservationQueue.add(
                'reservation',
                { seatIds },
                { delay: RESERVATION_DURATION_MINUTES * 60 * 1000 }
            );

            return reservedSeats;
        },
    };
}
