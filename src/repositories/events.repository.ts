import { db } from '../db/index.js';
import { eventSeats, events, seats } from '../db/schema.js';
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
        if (record.venueId) {
            const venueSeats = await db.select({ id: seats.id }).from(seats).where(eq(seats.venueId, record.venueId));
            if (venueSeats.length > 0) {
                await db.insert(eventSeats).values(
                    venueSeats.map((s) => ({
                        eventId: record.id,
                        seatId: s.id,
                        status: 'available' as const,
                    }))
                );
            }
        }
        return record;
    },
};
