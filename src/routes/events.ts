import type { FastifyInstance } from "fastify";
import type { IEventsService } from "../interfaces/events.service.interface.js";

interface EventsRoutesOptions {
    eventsService: IEventsService;
}

export async function eventsRoutes(app: FastifyInstance, opts: EventsRoutesOptions) {
    const { eventsService } = opts;
    app.get('/events', async (request, reply) => {
        const allEvents = await eventsService.findAllPublished();
        return reply.status(200).send(allEvents);
    });
}