import type { IReservationRepository } from "../interfaces/reservation.repositor.interface.js";
import type { IReservationService } from "../interfaces/reservation.service.interface.js";

export function createReservationService(reservationRepository: IReservationRepository): IReservationService {
    return {
        async reserve(seatIds: string[]): Promise<void> {
            await reservationRepository.reserve(seatIds);
        },
    };
}