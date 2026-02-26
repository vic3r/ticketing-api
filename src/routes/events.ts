import type { FastifyInstance } from 'fastify';
import type { EventRequest } from '../dto/events.dto.js';
import { EventCreationFailedError } from '../errors/events.errors.js';
import type { IEventsService } from '../interfaces/events.service.interface.js';
import { authenticate } from '../plugins/authenticate.js';
import { requireAdmin } from '../plugins/requireAdmin.js';
import { runWithSpan } from '../tracing.js';

interface EventsRoutesOptions {
    eventsService: IEventsService;
}

export async function eventsRoutes(app: FastifyInstance, opts: EventsRoutesOptions) {
    const { eventsService } = opts;
    app.get('/events', async (_request, reply) => {
        const allEvents = await runWithSpan('events.findAll', () => eventsService.findAllPublished());
        return reply.status(200).send(allEvents);
    });

    app.get('/events/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            const event = await runWithSpan('events.findById', (span) => {
                span.setAttribute('event.id', id);
                return eventsService.findById(id);
            });
            if (!event) {
                request.log.warn({ eventId: id }, 'event not found');
                return reply.status(404).send({ message: 'Event not found' });
            }
            return reply.status(200).send(event);
        } catch (error) {
            if (error instanceof Error) {
                request.log.error({ err: error, eventId: id }, 'get event failed');
                return reply.status(500).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });

    app.post('/events', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        const body = request.body;
        try {
            const event = await runWithSpan('events.create', (span) => {
                span.setAttribute('event.name', (body as EventRequest).name ?? '');
                return eventsService.create(body as EventRequest);
            });
            request.log.info({ eventId: event.id, name: event.name }, 'event created');
            return reply.status(201).send(event);
        } catch (error) {
            if (error instanceof EventCreationFailedError) {
                request.log.error({ err: error }, 'event creation failed');
                return reply.status(500).send({ message: error.message });
            }
            if (error instanceof Error) {
                request.log.warn({ err: error }, 'event create validation/error');
                return reply.status(400).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });
}