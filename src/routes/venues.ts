import type { FastifyInstance } from 'fastify';
import type { VenueRequest } from '../dto/venues.dto.js';
import { VenueCreationFailedError } from '../errors/venues.errors.js';
import type { IVenuesService } from '../interfaces/venues.service.interface.js';
import { authenticate } from '../plugins/authenticate.js';
import { requireAdmin } from '../plugins/requireAdmin.js';
import { runWithSpan } from '../tracing.js';

interface VenuesRoutesOptions {
    venuesService: IVenuesService;
}

export async function venuesRoutes(app: FastifyInstance, opts: VenuesRoutesOptions) {
    const { venuesService } = opts;

    app.post('/venues', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        const body = request.body;
        try {
            const venue = await runWithSpan('venues.create', (span) => {
                span.setAttribute('venue.name', (body as VenueRequest).name ?? '');
                return venuesService.create(body as VenueRequest);
            });
            request.log.info({ venueId: venue.id, name: venue.name }, 'venue created');
            return reply.status(201).send(venue);
        } catch (error) {
            if (error instanceof VenueCreationFailedError) {
                request.log.error({ err: error }, 'venue creation failed');
                return reply.status(500).send({ message: error.message });
            }
            if (error instanceof Error) {
                request.log.warn({ err: error }, 'venue create validation/error');
                return reply.status(400).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });
}
