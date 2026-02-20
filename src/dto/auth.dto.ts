export interface RegisterBody {
    email: string;
    password: string;
    name: string;
}

export interface UserResponse {
    id: string;
    email: string;
    name: string;
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
