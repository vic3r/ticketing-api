import type { FastifyInstance } from 'fastify';
import type { EventRequest } from '../dto/events.dto.js';
import { EventCreationFailedError } from '../errors/events.errors.js';
import type { IEventsService } from '../interfaces/events.service.interface.js';
import { authenticate } from '../plugins/authenticate.js';

interface EventsRoutesOptions {
    eventsService: IEventsService;
}

export async function eventsRoutes(app: FastifyInstance, opts: EventsRoutesOptions) {
    const { eventsService } = opts;
    app.get('/events', async (request, reply) => {
        const allEvents = await eventsService.findAllPublished();
        return reply.status(200).send(allEvents);
    });

    app.get('/events/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            const event = await eventsService.findById(id);
            if (!event) {
                return reply.status(404).send({ message: 'Event not found' });
            }
            return reply.status(200).send(event);
        } catch (error) {
            if (error instanceof Error) {
                return reply.status(500).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });

    app.post('/events', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body;
        try {
            const event = await eventsService.create(body as EventRequest);
            return reply.status(201).send(event);
        } catch (error) {
            if (error instanceof EventCreationFailedError) {
                return reply.status(500).send({ message: error.message });
            }
            if (error instanceof Error) {
                return reply.status(400).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });
}