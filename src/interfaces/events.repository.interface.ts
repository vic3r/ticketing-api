import type { InferSelectModel } from 'drizzle-orm';
import type { events } from '../db/schema.js';
import type { EventRequest } from '../dto/events.dto.js';

export type EventRecord = InferSelectModel<typeof events>;

export interface IEventsRepository {
    findAllPublished(): Promise<EventRecord[]>;
    findById(id: string): Promise<EventRecord | null>;
    create(event: EventRequest): Promise<EventRecord>;
}
