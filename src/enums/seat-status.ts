/** Matches seats_status in schema (available, sold, reserved). */
export enum SeatStatus {
    Available = 'available',
    Sold = 'sold',
    Reserved = 'reserved',
}

/** DB returns this; use for repository/input types. */
export type SeatStatusValue = `${SeatStatus}`;
