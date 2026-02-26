import type { FastifyInstance } from 'fastify';
import { ReservationConflictError } from '../errors/reservation.errors.js';
import type { IReservationService } from '../interfaces/reservation.service.interface.js';
import { authenticate } from '../plugins/authenticate.js';
import { runWithSpan } from '../tracing.js';

interface ReservationsRoutesOptions {
    reservationService: IReservationService;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function areValidUuids(ids: string[]): boolean {
    return ids.every((id) => UUID_REGEX.test(id));
}

export async function reservationsRoutes(app: FastifyInstance, opts: ReservationsRoutesOptions) {
    const { reservationService } = opts;
    app.post('/reservations', { preHandler: authenticate }, async (request, reply) => {
        const body = request.body as { eventId?: unknown; seatIds?: unknown };
        const eventId = body?.eventId;
        const seatIds = body?.seatIds;
        if (typeof eventId !== 'string' || !eventId) {
            request.log.warn('reservation rejected: eventId required');
            return reply.status(400).send({ message: 'eventId is required' });
        }
        if (!areValidUuids([eventId])) {
            return reply.status(400).send({ message: 'eventId must be a valid UUID' });
        }
        if (!seatIds || !isStringArray(seatIds) || seatIds.length === 0) {
            request.log.warn('reservation rejected: invalid seatIds');
            return reply.status(400).send({
                message: 'Seat IDs are required and must be a non-empty array of strings',
            });
        }
        if (!areValidUuids(seatIds)) {
            request.log.warn({ seatIds }, 'reservation rejected: seat IDs must be valid UUIDs');
            return reply.status(400).send({ message: 'Each seat ID must be a valid UUID' });
        }
        const user = request.user as { userId: string };
        if (!user?.userId) {
            return reply.status(401).send({ message: 'Unauthorized' });
        }
        try {
            const seats = await runWithSpan('reservations.lockSeats', (span) => {
                span.setAttribute('reservation.userId', user.userId);
                span.setAttribute('reservation.eventId', eventId);
                span.setAttribute('reservation.seatCount', seatIds.length);
                return reservationService.lockSeatsForReservation(user.userId, eventId, seatIds);
            });
            request.log.info(
                { userId: user.userId, eventId, seatIds, count: seats.length },
                'seats reserved'
            );
            return reply.status(200).send({ seats });
        } catch (error) {
            if (error instanceof ReservationConflictError) {
                request.log.warn(
                    { userId: user.userId, seatIds },
                    'reservation conflict: seats not available'
                );
                return reply.status(409).send({ message: error.message });
            }
            if (error instanceof Error) {
                request.log.error(
                    { err: error, userId: user.userId, seatIds },
                    'reservation failed'
                );
                return reply.status(500).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'An unknown error occurred' });
        }
    });
}
