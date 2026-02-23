import { db } from "../db/index.js";
import { seats } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { IReservationRepository } from "../interfaces/reservation.repositor.interface.js";

export const reservationRepository: IReservationRepository = {
    async reserve(seatIds: string[]): Promise<void> {
        for (const seatId of seatIds) {
            await db.update(seats)
                .set({ status: 'available', reservedUntil: null })
                .where(eq(seats.id, seatId));
        }
        console.log('Released successfully from expired reservations for seats: ', seatIds);
    },
};