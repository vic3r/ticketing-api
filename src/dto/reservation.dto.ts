import type { SeatStatus } from '../enums/seat-status.js';

export interface ReservedSeatResponse {
    id: string;
    section: string;
    row: string | null;
    seatNumber: number | null;
    status: SeatStatus;
}
