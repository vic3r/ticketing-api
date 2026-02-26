import type { EventStatus } from '../enums/event-status.js';

/**
 * API response shape for an event (what we return to clients).
 * Kept separate from the database model so we control the public contract.
 */
export interface EventResponse {
    id: string;
    organizerId: string;
    venueId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    startDate: Date;
    endDate: Date;
    status: EventStatus;
    isPublished: boolean | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventRequest {
    venueId: string;
    organizerId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    startDate: Date;
    endDate: Date;
    /** If true, event appears in GET /events (public list). Default false (draft). */
    isPublished?: boolean;
}
