import type { InferSelectModel } from 'drizzle-orm';
import type { events } from '../db/schema.js';

export type EventRecord = InferSelectModel<typeof events>;

export interface IEventsRepository {
    findAllPublished(): Promise<EventRecord[]>;
}
