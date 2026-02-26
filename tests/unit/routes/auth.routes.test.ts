import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../../src/app.js';
import type { IAuthService } from '../../../src/interfaces/auth.service.interface.js';
import {
    EmailAlreadyRegisteredError,
    InvalidEmailOrPasswordError,
} from '../../../src/errors/auth.errors.js';

describe('Auth routes', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    let mockAuthService: IAuthService;

    beforeEach(async () => {
        mockAuthService = {
            register: vi.fn(),
            login: vi.fn(),
        };
        app = buildApp({ authService: mockAuthService });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });

    describe('POST /auth/register', () => {
        it('returns 201 and token + user (happy path)', async () => {
            vi.mocked(mockAuthService.register).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test',
                role: 'user',
            });
            const res = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'test@example.com', password: 'secret123', name: 'Test' },
            });
            expect(res.statusCode).toBe(201);
            const body = res.json();
            expect(body).toHaveProperty('token');
            expect(body.user).toEqual({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test',
                role: 'user',
            });
        });

        it('returns 400 when email already registered', async () => {
            vi.mocked(mockAuthService.register).mockRejectedValue(
                new EmailAlreadyRegisteredError()
            );
            const res = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'taken@example.com', password: 'p', name: 'X' },
            });
            expect(res.statusCode).toBe(400);
            expect(res.json()).toMatchObject({ message: 'Email already registered' });
        });

        it('returns 500 when service throws generic error', async () => {
            vi.mocked(mockAuthService.register).mockRejectedValue(new Error('DB error'));
            const res = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'a@b.com', password: 'p', name: 'N' },
            });
            expect(res.statusCode).toBe(500);
            expect(res.json()).toMatchObject({ message: 'DB error' });
        });

        it('returns 400 for invalid body (validation)', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'not-an-email', password: '', name: '' },
            });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /auth/login', () => {
        it('returns 200 and token + user (happy path)', async () => {
            vi.mocked(mockAuthService.login).mockResolvedValue({
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                role: 'user',
            });
            const res = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: 'u@example.com', password: 'secret' },
            });
            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body).toHaveProperty('token');
            expect(body.user.email).toBe('u@example.com');
        });

        it('returns 401 when invalid email or password', async () => {
            vi.mocked(mockAuthService.login).mockRejectedValue(new InvalidEmailOrPasswordError());
            const res = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: 'u@example.com', password: 'wrong' },
            });
            expect(res.statusCode).toBe(401);
            expect(res.json()).toMatchObject({ message: 'Invalid email or password' });
        });

        it('returns 400 for invalid body', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {},
            });
            expect(res.statusCode).toBe(400);
        });
    });
});
