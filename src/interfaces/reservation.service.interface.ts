export interface IReservationService {
    reserve(seatIds: string[]): Promise<void>;
}