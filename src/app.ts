import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import type { IAuthService } from './interfaces/auth.service.interface.js';
import type { IEventsService } from './interfaces/events.service.interface.js';
import type { IEventsRepository } from './interfaces/events.repository.interface.js';
import type { IUserRepository } from './interfaces/user.repository.interface.js';
import { userRepository } from './repositories/user.repository.js';
import { createAuthService } from './services/auth.service.js';
import { authRoutes } from './routes/auth.js';
import { createQueueConnection } from './redis.js';
import { createReservationQueue } from './queues/reservation.queue.js';
import { createReservationRepository } from './repositories/reservation.repository.js';
import { createReservationService } from './services/reservation.service.js';
import { reservationsRoutes } from './routes/reservations.js';
import { eventsRoutes } from './routes/events.js';
import { createEventsService } from './services/events.service.js';
import { eventsRepository } from './repositories/events.repository.js';
import { ordersRoutes } from './routes/orders.js';
import { createOrdersService } from './services/orders.service.js';
import { createOrdersRepository } from './repositories/orders.repository.js';

export interface AppDependencies {
    userRepository?: IUserRepository;
    authService?: IAuthService;
    eventsRepository?: IEventsRepository;
    eventsService?: IEventsService;
}

export const buildApp = (deps?: AppDependencies) => {
    const app = Fastify();

    app.register(helmet);
    app.register(cors, { origin: process.env.FRONTEND_URL ?? true });
    app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret' });

    app.get('/health', async () => {
        return { status: 'ok' };
    });

    const authService = deps?.authService ?? createAuthService(deps?.userRepository ?? userRepository);
    app.register(authRoutes, { authService });
    const eventsService = deps?.eventsService ?? createEventsService(deps?.eventsRepository ?? eventsRepository);
    app.register(eventsRoutes, { eventsService });
    const queueConnection = createQueueConnection();
    const reservationQueue = createReservationQueue(queueConnection);
    const reservationRepository = createReservationRepository(reservationQueue);
    const reservationService = createReservationService(reservationRepository);
    const ordersRepository = createOrdersRepository();
    const ordersService = createOrdersService(ordersRepository);
    app.register(reservationsRoutes, { reservationService });
    app.register(ordersRoutes, { ordersService });

    return app;
};