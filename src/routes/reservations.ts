import type { FastifyInstance } from 'fastify';
import type { IReservationService } from '../interfaces/reservation.service.interface.js';
import { ReservationConflictError } from '../repositories/reservation.repository.js';

interface ReservationsRoutesOptions {
    reservationService: IReservationService;
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export async function reservationsRoutes(app: FastifyInstance, opts: ReservationsRoutesOptions) {
    const { reservationService } = opts;
    app.post('/reservations', async (request, reply) => {
        const body = request.body as { seatIds?: unknown };
        const seatIds = body?.seatIds;
        if (!seatIds || !isStringArray(seatIds) || seatIds.length === 0) {
            return reply.status(400).send({ message: 'Seat IDs are required and must be a non-empty array of strings' });
        }
        const user = request.user as { userId: string } | undefined;
        if (!user) {
            return reply.status(401).send({ message: 'Unauthorized' });
        }
        try {
            const seats = await reservationService.lockSeatsForReservation(user.userId, seatIds);
            return reply.status(200).send({ seats });
        } catch (error) {
            if (error instanceof ReservationConflictError) {
                return reply.status(409).send({ message: error.message });
            }
            if (error instanceof Error) {
                return reply.status(500).send({ message: error.message });
            }
            return reply.status(500).send({ message: 'Failed to lock seats for reservation' });
        }
    });
}