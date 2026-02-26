import type { InferSelectModel } from 'drizzle-orm';
import type { events } from '../db/schema.js';
import type { EventRequest } from '../dto/events.dto.js';

export type EventRecord = InferSelectModel<typeof events>;

export interface EventSeatInfo {
    id: string;
    section: string;
    row: string | null;
    seatNumber: number | null;
    status: string;
}

export interface IEventsRepository {
    findAllPublished(): Promise<EventRecord[]>;
    findById(id: string): Promise<EventRecord | null>;
    create(event: EventRequest): Promise<EventRecord>;
    findSeatsByEventId(eventId: string): Promise<EventSeatInfo[]>;
}
