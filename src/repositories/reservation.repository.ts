import { db } from '../db/index.js';
import { eventSeats, seats } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import type { ReservedSeatResponse } from '../dto/reservation.dto.js';
import { SeatStatus } from '../enums/seat-status.js';
import { ReservationConflictError } from '../errors/reservation.errors.js';
import type { IReservationQueue } from '../interfaces/reservation-queue.interface.js';
import type { IReservationRepository } from '../interfaces/reservation.repository.interface.js';

const RESERVATION_DURATION_MINUTES = 10;

function toReservedSeatResponse(seat: {
    id: string;
    section: string;
    row: string | null;
    seatNumber: number | null;
}): ReservedSeatResponse {
    return {
        id: seat.id,
        section: seat.section,
        row: seat.row,
        seatNumber: seat.seatNumber,
        status: SeatStatus.Reserved,
    };
}

export function createReservationRepository(
    reservationQueue: IReservationQueue
): IReservationRepository {
    return {
        async reserve(eventId: string, seatIds: string[]): Promise<void> {
            await db
                .update(eventSeats)
                .set({ status: SeatStatus.Available, reservedUntil: null })
                .where(and(eq(eventSeats.eventId, eventId), inArray(eventSeats.seatId, seatIds)));
        },
        async lockSeatsForReservation(
            _userId: string,
            eventId: string,
            seatIds: string[]
        ): Promise<ReservedSeatResponse[]> {
            const reservedSeats = await db.transaction(async (tx) => {
                const locked = await tx
                    .select({
                        id: seats.id,
                        section: seats.section,
                        row: seats.row,
                        seatNumber: seats.seatNumber,
                    })
                    .from(eventSeats)
                    .innerJoin(seats, eq(eventSeats.seatId, seats.id))
                    .where(
                        and(
                            eq(eventSeats.eventId, eventId),
                            inArray(eventSeats.seatId, seatIds),
                            eq(eventSeats.status, SeatStatus.Available)
                        )
                    )
                    .for('update', { skipLocked: true, of: eventSeats });

                if (locked.length !== seatIds.length) {
                    throw new ReservationConflictError();
                }

                const reservedUntil = new Date(
                    Date.now() + RESERVATION_DURATION_MINUTES * 60 * 1000
                );
                await tx
                    .update(eventSeats)
                    .set({ status: SeatStatus.Reserved, reservedUntil })
                    .where(
                        and(eq(eventSeats.eventId, eventId), inArray(eventSeats.seatId, seatIds))
                    );

                return locked.map(toReservedSeatResponse);
            });

            await reservationQueue.add(
                'reservation',
                { eventId, seatIds },
                { delay: RESERVATION_DURATION_MINUTES * 60 * 1000 }
            );

            return reservedSeats;
        },
    };
}
