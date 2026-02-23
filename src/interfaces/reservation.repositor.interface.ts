export interface IReservationRepository {
    reserve(seatIds: string[]): Promise<void>;
}