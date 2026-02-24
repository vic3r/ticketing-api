import type { ReservedSeatResponse } from '../dto/reservation.dto.js';

export interface IReservationRepository {
    reserve(seatIds: string[]): Promise<void>;
    lockSeatsForReservation(userId: string, seatIds: string[]): Promise<ReservedSeatResponse[]>;
}