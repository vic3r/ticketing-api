import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { EventCreationFailedError } from '../errors/events.errors.js';
import type { EventRecord, IEventsRepository } from '../interfaces/events.repository.interface.js';
import type { EventRequest } from '../dto/events.dto.js';

export const eventsRepository: IEventsRepository = {
    async findAllPublished() {
        return db.select().from(events).where(eq(events.isPublished, true));
    },
    async findById(id) {
        const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
        return rows[0] ?? null;
    },
    async create(input: EventRequest) {
        const startDate = input.startDate instanceof Date ? input.startDate : new Date(input.startDate as unknown as string);
        const endDate = input.endDate instanceof Date ? input.endDate : new Date(input.endDate as unknown as string);
        const [record] = await db
            .insert(events)
            .values({
                venueId: input.venueId,
                organizerId: input.organizerId,
                name: input.name,
                description: input.description,
                imageUrl: input.imageUrl,
                startDate,
                endDate,
            })
            .returning();
        if (!record) throw new EventCreationFailedError();
        return record;
    },
};
