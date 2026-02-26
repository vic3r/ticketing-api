import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthService } from '../../../src/services/auth.service.js';
import {
    EmailAlreadyRegisteredError,
    InvalidEmailOrPasswordError,
} from '../../../src/errors/auth.errors.js';
import type { IUserRepository } from '../../../src/interfaces/user.repository.interface.js';

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed'),
        compare: vi.fn().mockResolvedValue(true),
    },
}));

describe('AuthService', () => {
    let mockUserRepository: IUserRepository;

    beforeEach(() => {
        mockUserRepository = {
            findByEmail: vi.fn(),
            create: vi.fn(),
        };
        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(undefined);
        vi.mocked(mockUserRepository.create).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test',
            passwordHash: 'hashed',
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('register', () => {
        it('returns user and does not throw when email is not taken (happy path)', async () => {
            const service = createAuthService(mockUserRepository);
            const result = await service.register({
                email: 'new@example.com',
                password: 'secret',
                name: 'New User',
            });
            expect(result).toEqual({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test',
                role: 'user',
            });
            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
            expect(mockUserRepository.create).toHaveBeenCalledOnce();
        });

        it('throws EmailAlreadyRegisteredError when email is already registered', async () => {
            vi.mocked(mockUserRepository.findByEmail).mockResolvedValue({
                id: 'existing',
                email: 'taken@example.com',
                name: 'Existing',
                passwordHash: 'hash',
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const service = createAuthService(mockUserRepository);
            await expect(
                service.register({ email: 'taken@example.com', password: 'p', name: 'X' })
            ).rejects.toThrow(EmailAlreadyRegisteredError);
            expect(mockUserRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('returns user when email and password match (happy path)', async () => {
            vi.mocked(mockUserRepository.findByEmail).mockResolvedValue({
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                passwordHash: 'hashed',
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const service = createAuthService(mockUserRepository);
            const result = await service.login({ email: 'u@example.com', password: 'correct' });
            expect(result).toEqual({
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                role: 'user',
            });
        });

        it('throws InvalidEmailOrPasswordError when user not found', async () => {
            vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(undefined);
            const service = createAuthService(mockUserRepository);
            await expect(
                service.login({ email: 'nonexistent@example.com', password: 'any' })
            ).rejects.toThrow(InvalidEmailOrPasswordError);
        });

        it('throws InvalidEmailOrPasswordError when password is wrong', async () => {
            const bcrypt = await import('bcrypt');
            (vi.mocked(bcrypt.default.compare) as ReturnType<typeof vi.fn>).mockResolvedValue(
                false
            );
            vi.mocked(mockUserRepository.findByEmail).mockResolvedValue({
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                passwordHash: 'hashed',
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const service = createAuthService(mockUserRepository);
            await expect(
                service.login({ email: 'u@example.com', password: 'wrong' })
            ).rejects.toThrow(InvalidEmailOrPasswordError);
        });
    });
});
