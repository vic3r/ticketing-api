import type { FastifyInstance } from 'fastify';
import type { LoginBody, LoginResponse, RegisterBody, RegisterResponse } from '../dto/auth.dto.js';
import { EmailAlreadyRegisteredError, InvalidEmailOrPasswordError } from '../errors/auth.errors.js';
import type { IAuthService } from '../interfaces/auth.service.interface.js';
import { authRateLimit, getPublic500Message } from '../config/security.js';
import { runWithSpan } from '../tracing.js';

/** Max lengths to prevent abuse and align with OWASP input validation. */
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MAX_LENGTH = 512;
const NAME_MAX_LENGTH = 200;

export const registerBodySchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
            email: { type: 'string', format: 'email', maxLength: EMAIL_MAX_LENGTH },
            password: { type: 'string', minLength: 1, maxLength: PASSWORD_MAX_LENGTH },
            name: { type: 'string', minLength: 1, maxLength: NAME_MAX_LENGTH },
        },
    },
} as const;

export const loginBodySchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email', maxLength: EMAIL_MAX_LENGTH },
            password: { type: 'string', minLength: 1, maxLength: PASSWORD_MAX_LENGTH },
        },
    },
} as const;

interface AuthRoutesOptions {
    authService: IAuthService;
    authRateLimitMax?: number;
    authRateLimitTimeWindowMs?: number;
}

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions) {
    const { authService, authRateLimitMax, authRateLimitTimeWindowMs } = opts;
    const authMax = authRateLimitMax ?? authRateLimit.max;
    const authWindow = authRateLimitTimeWindowMs ?? authRateLimit.timeWindowMs;
    app.post<{ Body: RegisterBody }>(
        '/auth/register',
        {
            schema: registerBodySchema,
            config: {
                rateLimit: { max: authMax, timeWindow: authWindow },
            },
        },
        async (request, reply) => {
            const body = request.body;
            try {
                const user = await runWithSpan('auth.register', async (span) => {
                    span.setAttribute('auth.email', body.email);
                    return authService.register(body);
                });
                const token = app.jwt.sign(
                    { userId: user.id, email: user.email },
                    { expiresIn: '7d' }
                );
                request.log.info({ userId: user.id, email: user.email }, 'user registered');
                const response: RegisterResponse = { token, user };
                return reply.status(201).send(response);
            } catch (error) {
                if (error instanceof EmailAlreadyRegisteredError) {
                    request.log.warn({ email: body.email }, 'register failed: email already taken');
                    return reply.status(400).send({ message: error.message });
                }
                if (error instanceof Error) {
                    request.log.error({ err: error, email: body.email }, 'register failed');
                    return reply.status(500).send({ message: getPublic500Message(error.message) });
                }
                return reply.status(500).send({ message: 'An unknown error occurred' });
            }
        }
    );

    app.post<{ Body: LoginBody }>(
        '/auth/login',
        {
            schema: loginBodySchema,
            config: {
                rateLimit: { max: authMax, timeWindow: authWindow },
            },
        },
        async (request, reply) => {
            const body = request.body;
            try {
                const user = await runWithSpan('auth.login', async (span) => {
                    span.setAttribute('auth.email', body.email);
                    return authService.login(body);
                });
                const token = app.jwt.sign(
                    { userId: user.id, email: user.email },
                    { expiresIn: '7d' }
                );
                request.log.info({ userId: user.id, email: user.email }, 'user logged in');
                const response: LoginResponse = { token, user };
                return reply.status(200).send(response);
            } catch (error) {
                if (error instanceof InvalidEmailOrPasswordError) {
                    request.log.warn({ email: body.email }, 'login failed: invalid credentials');
                    return reply.status(401).send({ message: error.message });
                }
                if (error instanceof Error) {
                    request.log.error({ err: error, email: body.email }, 'login failed');
                    return reply.status(500).send({ message: getPublic500Message(error.message) });
                }
                return reply.status(500).send({ message: 'An unknown error occurred' });
            }
        }
    );
}
