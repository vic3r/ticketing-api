/** Matches event_status in schema (draft, published, cancelled). */
export enum EventStatus {
    Draft = 'draft',
    Published = 'published',
    Cancelled = 'cancelled',
}

/** DB returns this; use for repository/input types. */
export type EventStatusValue = `${EventStatus}`;
