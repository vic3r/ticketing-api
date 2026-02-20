import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { events } from "../db/schema.js";
import { db } from "../db/index.js";

export async function eventsRoutes(app: FastifyInstance) {
    app.get('/events', async (request, reply) => {
        const events = await db.query.events.findMany({
            where: eq(events.isPublished, 'published'),
        });
        return reply.status(200).send(events);
    });
}