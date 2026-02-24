/**
 * Reservation errors. Map in routes:
 * - ReservationConflictError → 409
 */

export class ReservationConflictError extends Error {
    constructor(message = 'One or more seats are not available') {
        super(message);
        this.name = 'ReservationConflictError';
    }
}
