import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { IEventsRepository } from '../interfaces/events.repository.interface.js';

export const eventsRepository: IEventsRepository = {
    async findAllPublished() {
        return db.query.events.findMany({
            where: eq(events.isPublished, true),
        });
    },
};
