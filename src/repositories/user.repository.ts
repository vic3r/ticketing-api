import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type {
    IUserRepository,
    User,
    CreateUserInput,
} from '../interfaces/user.repository.interface.js';

export type { User, CreateUserInput } from '../interfaces/user.repository.interface.js';

export const userRepository: IUserRepository = {
    async findByEmail(email: string): Promise<User | undefined> {
        return db.query.users.findFirst({
            where: eq(users.email, email),
        }) as Promise<User | undefined>;
    },

    async create(data: CreateUserInput): Promise<User> {
        const [user] = await db
            .insert(users)
            .values({
                email: data.email,
                passwordHash: data.passwordHash,
                name: data.name,
                role: data.role ?? 'user',
            })
            .returning();
        if (!user) throw new Error('Failed to create user');
        return user as User;
    },
};
