import type { ReservedSeatResponse } from '../dto/reservation.dto.js';
import type { IReservationRepository } from '../interfaces/reservation.repository.interface.js';
import type { IReservationService } from '../interfaces/reservation.service.interface.js';

export function createReservationService(
    reservationRepository: IReservationRepository
): IReservationService {
    return {
        async reserve(eventId: string, seatIds: string[]): Promise<void> {
            await reservationRepository.reserve(eventId, seatIds);
        },
        async lockSeatsForReservation(
            userId: string,
            eventId: string,
            seatIds: string[]
        ): Promise<ReservedSeatResponse[]> {
            return reservationRepository.lockSeatsForReservation(userId, eventId, seatIds);
        },
    };
}