import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { EventCreationFailedError } from '../errors/events.errors.js';
import type { EventRecord, IEventsRepository } from '../interfaces/events.repository.interface.js';
import type { EventRequest } from '../dto/events.dto.js';

export const eventsRepository: IEventsRepository = {
    async findAllPublished() {
        return db.query.events.findMany({
            where: eq(events.isPublished, true),
        });
    },
    async findById(id) {
        return db.query.events.findFirst({
            where: eq(events.id, id),
            with: {
                venue: true,
                ticketTiers: true,
                seats: true,
            },
        }) as unknown as EventRecord;
    },
    async create(input: EventRequest) {
        const [record] = await db
            .insert(events)
            .values({
                venueId: input.venueId,
                organizerId: input.organizerId,
                name: input.name,
                description: input.description,
                imageUrl: input.imageUrl,
                startDate: input.startDate,
                endDate: input.endDate,
            })
            .returning();
        if (!record) throw new EventCreationFailedError();
        return record;
    },
};
