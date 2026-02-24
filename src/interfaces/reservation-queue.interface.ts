/**
 * Minimal contract for adding a delayed release job.
 * Use this in the repository so you can mock the queue in tests.
 */
export interface IReservationQueue {
    add(
        name: string,
        data: { seatIds: string[] },
        opts: { delay: number }
    ): Promise<unknown>;
}
