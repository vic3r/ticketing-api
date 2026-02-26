import { describe, expect, it, vi } from 'vitest';
import { requireAdmin } from '../../../src/plugins/requireAdmin.js';

describe('requireAdmin', () => {
    it('sends 401 when user is missing', async () => {
        const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
        const request = { user: undefined, log: { warn: vi.fn() } };

        await requireAdmin(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(401);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('sends 401 when user has no userId', async () => {
        const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
        const request = { user: { email: 'x', role: 'user' }, log: { warn: vi.fn() } };

        await requireAdmin(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(401);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('sends 403 when user is not admin', async () => {
        const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
        const request = {
            user: { userId: 'u1', email: 'u@x.com', role: 'user' },
            log: { warn: vi.fn() },
        };

        await requireAdmin(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(403);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Admin access required' });
    });

    it('does not send response when user is admin', async () => {
        const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
        const request = {
            user: { userId: 'a1', email: 'a@x.com', role: 'admin' },
            log: { warn: vi.fn() },
        };

        await requireAdmin(request as never, reply as never);

        expect(reply.status).not.toHaveBeenCalled();
        expect(reply.send).not.toHaveBeenCalled();
    });
});
