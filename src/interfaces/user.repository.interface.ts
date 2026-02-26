export type UserRole = 'user' | 'admin';

export interface User {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserInput {
    email: string;
    passwordHash: string;
    name: string;
    role?: UserRole;
}

export interface IUserRepository {
    findByEmail(email: string): Promise<User | undefined>;
    create(data: CreateUserInput): Promise<User>;
}
