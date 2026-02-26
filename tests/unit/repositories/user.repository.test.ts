import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userRepository } from '../../../src/repositories/user.repository.js';

const mocks = vi.hoisted(() => ({
    mockFindFirst: vi.fn(),
    mockReturning: vi.fn(),
}));

vi.mock('../../../src/db/index.js', () => ({
    db: {
        query: {
            users: {
                findFirst: (opts: unknown) => mocks.mockFindFirst(opts),
            },
        },
        insert: () => ({
            values: () => ({
                returning: () => mocks.mockReturning(),
            }),
        }),
    },
}));

vi.mock('../../../src/db/schema.js', () => ({
    users: {},
}));

describe('User repository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockReturning.mockResolvedValue([]);
    });

    describe('findByEmail', () => {
        it('returns user when found', async () => {
            const user = {
                id: 'u1',
                email: 'u@example.com',
                name: 'User',
                passwordHash: 'hash',
                role: 'user' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mocks.mockFindFirst.mockResolvedValue(user);

            const result = await userRepository.findByEmail('u@example.com');

            expect(result).toEqual(user);
        });

        it('returns undefined when not found', async () => {
            mocks.mockFindFirst.mockResolvedValue(undefined);

            const result = await userRepository.findByEmail('nobody@example.com');

            expect(result).toBeUndefined();
        });
    });

    describe('create', () => {
        it('returns created user', async () => {
            const created = {
                id: 'new-id',
                email: 'new@example.com',
                name: 'New User',
                passwordHash: 'hashed',
                role: 'user' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mocks.mockReturning.mockResolvedValueOnce([created]);

            const result = await userRepository.create({
                email: 'new@example.com',
                passwordHash: 'hashed',
                name: 'New User',
            });

            expect(result).toEqual(created);
        });

        it('uses default role "user" when not provided', async () => {
            const created = {
                id: 'id',
                email: 'a@b.com',
                name: 'A',
                passwordHash: 'h',
                role: 'user' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mocks.mockReturning.mockResolvedValueOnce([created]);

            await userRepository.create({
                email: 'a@b.com',
                passwordHash: 'h',
                name: 'A',
            });

            expect(mocks.mockReturning).toHaveBeenCalled();
        });

        it('throws when insert returns empty', async () => {
            mocks.mockReturning.mockResolvedValueOnce([]);

            await expect(
                userRepository.create({
                    email: 'x@y.com',
                    passwordHash: 'h',
                    name: 'X',
                })
            ).rejects.toThrow('Failed to create user');
        });
    });
});
