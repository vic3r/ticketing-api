import type { ReservedSeatResponse } from '../dto/reservation.dto.js';

export interface IReservationRepository {
    reserve(eventId: string, seatIds: string[]): Promise<void>;
    lockSeatsForReservation(userId: string, eventId: string, seatIds: string[]): Promise<ReservedSeatResponse[]>;
}