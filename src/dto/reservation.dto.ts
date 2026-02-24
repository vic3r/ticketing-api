export interface ReservedSeatResponse {
    id: string;
    section: string;
    row: string | null;
    seatNumber: number | null;
    status: string;
}
