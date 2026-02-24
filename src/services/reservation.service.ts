import type { ReservedSeatResponse } from '../dto/reservation.dto.js';
import type { IReservationRepository } from '../interfaces/reservation.repository.interface.js';
import type { IReservationService } from '../interfaces/reservation.service.interface.js';

export function createReservationService(
    reservationRepository: IReservationRepository
): IReservationService {
    return {
        async reserve(seatIds: string[]): Promise<void> {
            await reservationRepository.reserve(seatIds);
        },
        async lockSeatsForReservation(
            userId: string,
            seatIds: string[]
        ): Promise<ReservedSeatResponse[]> {
            return reservationRepository.lockSeatsForReservation(userId, seatIds);
        },
    };
}