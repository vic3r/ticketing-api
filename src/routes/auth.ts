import type { FastifyInstance } from 'fastify';
import type { LoginBody, LoginResponse, RegisterBody, RegisterResponse } from '../dto/auth.dto.js';
import { EmailAlreadyRegisteredError, InvalidEmailOrPasswordError } from '../errors/auth.errors.js';
import type { IAuthService } from '../interfaces/auth.service.interface.js';

export const registerBodySchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
        },
    },
} as const;

export const loginBodySchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
        },
    },
} as const;

interface AuthRoutesOptions {
    authService: IAuthService;
}

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions) {
    const { authService } = opts;
    app.post<{ Body: RegisterBody }>(
        '/auth/register',
        { schema: registerBodySchema },
        async (request, reply) => {
            const body = request.body;
            try {
                const user = await authService.register(body);
                const token = app.jwt.sign(
                    { userId: user.id, email: user.email },
                    { expiresIn: '7d' }
                );
                const response: RegisterResponse = { token, user };
                return reply.status(201).send(response);
            } catch (error) {
                if (error instanceof EmailAlreadyRegisteredError) {
                    return reply.status(400).send({ message: error.message });
                }
                if (error instanceof Error) {
                    return reply.status(500).send({ message: error.message });
                }
                return reply.status(500).send({ message: 'An unknown error occurred' });
            }
        }
    );

    app.post<{ Body: LoginBody }>(
        '/auth/login',
        { schema: loginBodySchema },
        async (request, reply) => {
            const body = request.body;
            try {
                const user = await authService.login(body);
                const token = app.jwt.sign(
                    { userId: user.id, email: user.email },
                    { expiresIn: '7d' }
                );
                const response: LoginResponse = { token, user };
                return reply.status(200).send(response);
            } catch (error) {
                if (error instanceof InvalidEmailOrPasswordError) {
                    return reply.status(401).send({ message: error.message });
                }
                if (error instanceof Error) {
                    return reply.status(500).send({ message: error.message });
                }
                return reply.status(500).send({ message: 'An unknown error occurred' });
            }
        }
    );
}
