import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import type { IAuthService } from './interfaces/auth.service.interface.js';
import type { IUserRepository } from './interfaces/user.repository.interface.js';
import { userRepository } from './repositories/user.repository.js';
import { createAuthService } from './services/auth.service.js';
import { authRoutes } from './routes/auth.js';

export interface AppDependencies {
    userRepository?: IUserRepository;
    authService?: IAuthService;
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
    return app;
};