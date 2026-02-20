export interface User {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserInput {
    email: string;
    passwordHash: string;
    name: string;
}

export interface IUserRepository {
    findByEmail(email: string): Promise<User | undefined>;
    create(data: CreateUserInput): Promise<User>;
}
