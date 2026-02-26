export interface RegisterBody {
    email: string;
    password: string;
    name: string;
}

export type UserRole = 'user' | 'admin';

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    role: UserRole;
}

export interface RegisterResponse {
    token: string;
    user: UserResponse;
}

export interface LoginBody {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: UserResponse;
}
