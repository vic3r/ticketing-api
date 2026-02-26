import type { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtUser {
    userId: string;
    email: string;
    role: string;
}

/** Use after authenticate(). Returns 403 if the user is not an admin. */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JwtUser | undefined;
    if (!user?.userId) {
        return reply.status(401).send({ message: 'Unauthorized' });
    }
    if (user.role !== 'admin') {
        request.log.warn({ userId: user.userId, role: user.role }, 'admin required');
        return reply.status(403).send({ message: 'Admin access required' });
    }
}
