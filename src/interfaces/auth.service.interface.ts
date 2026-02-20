import type { LoginBody, RegisterBody, UserResponse } from '../dto/auth.dto.js';

export interface IAuthService {
    register(body: RegisterBody): Promise<UserResponse>;
    login(body: LoginBody): Promise<UserResponse>;
}
