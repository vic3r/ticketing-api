import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { IAuthService } from './interfaces/auth.service.interface.js';
import type { IEventsService } from './interfaces/events.service.interface.js';
import type { IEventsRepository } from './interfaces/events.repository.interface.js';
import type { IUserRepository } from './interfaces/user.repository.interface.js';
import type { IReservationService } from './interfaces/reservation.service.interface.js';
import type { IOrdersService } from './interfaces/orders.service.interface.js';
import {
    getCorsOrigin,
    rateLimit as rateLimitConfig,
    authRateLimit as authRateLimitConfig,
    bodyLimit,
    helmetOptions,
} from './config/security.js';
import { loggerOptions } from './config/logger.js';
import type { FastifyRequest } from 'fastify';
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
    reservationService?: IReservationService;
    ordersService?: IOrdersService;
    /** Override for tests: global rate limit max (per window). */
    rateLimitMax?: number;
    /** Override for tests: auth route rate limit max. */
    authRateLimitMax?: number;
    /** Override for tests: stable key so all requests count as same client. */
    rateLimitKeyGenerator?: (req: FastifyRequest) => string;
}

export const buildApp = (deps?: AppDependencies) => {
    const app = Fastify({
        bodyLimit,
        logger: loggerOptions,
        disableRequestLogging: true, // we log in onResponse with level by statusCode
        schemaErrorFormatter(errors, dataVar) {
            const messages = errors.map((e: { instancePath?: string; message?: string }) => `${dataVar}${e.instancePath ?? ''} ${e.message ?? ''}`).join(', ');
            const err = new Error(messages) as Error & { statusCode: number; code: string };
            err.statusCode = 400;
            err.code = 'FST_ERR_VALIDATION';
            return err;
        },
    });

    app.addHook('onRequest', (request, _reply, done) => {
        (request.raw as { reqStartTime?: number }).reqStartTime = Date.now();
        done();
    });
    app.addHook('onResponse', (request, reply, done) => {
        const statusCode = reply.statusCode;
        const reqStart = (request.raw as { reqStartTime?: number }).reqStartTime ?? Date.now();
        const logPayload = {
            method: request.method,
            url: request.url,
            statusCode,
            responseTimeMs: Date.now() - reqStart,
        };
        if (statusCode >= 500) request.log.error(logPayload, 'request completed');
        else if (statusCode >= 400) request.log.warn(logPayload, 'request completed');
        else request.log.info(logPayload, 'request completed');
        done();
    });


    app.register(helmet, helmetOptions);
    app.register(cors, { origin: getCorsOrigin(), credentials: true });
    const globalMax = deps?.rateLimitMax ?? rateLimitConfig.max;
    const authMax = deps?.authRateLimitMax ?? authRateLimitConfig.max;
    app.register(rateLimit, {
        max: globalMax,
        timeWindow: rateLimitConfig.timeWindowMs,
        ...(deps?.rateLimitKeyGenerator && { keyGenerator: deps.rateLimitKeyGenerator }),
        errorResponseBuilder: (_request, context) => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded, retry after ${context.after}`,
        }),
    });
    app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret' });

    app.get('/health', async () => {
        return { status: 'ok' };
    });

    const authService = deps?.authService ?? createAuthService(deps?.userRepository ?? userRepository);
    app.register(authRoutes, { authService, authRateLimitMax: authMax, authRateLimitTimeWindowMs: authRateLimitConfig.timeWindowMs });
    const eventsService = deps?.eventsService ?? createEventsService(deps?.eventsRepository ?? eventsRepository);
    app.register(eventsRoutes, { eventsService });
    const reservationService =
        deps?.reservationService ??
        (() => {
            const queueConnection = createQueueConnection();
            const reservationQueue = createReservationQueue(queueConnection);
            const reservationRepository = createReservationRepository(reservationQueue);
            return createReservationService(reservationRepository);
        })();
    const ordersService =
        deps?.ordersService ??
        (() => createOrdersService(createOrdersRepository()))();
    app.register(reservationsRoutes, { reservationService });
    app.register(ordersRoutes, { ordersService });

    return app;
};