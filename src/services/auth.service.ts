import bcrypt from 'bcrypt';
import type { LoginBody, RegisterBody, UserResponse } from '../dto/auth.dto.js';
import { EmailAlreadyRegisteredError, InvalidEmailOrPasswordError } from '../errors/auth.errors.js';
import type { IAuthService } from '../interfaces/auth.service.interface.js';
import type { IUserRepository } from '../interfaces/user.repository.interface.js';

export { EmailAlreadyRegisteredError, InvalidEmailOrPasswordError };

function toUserResponse(user: { id: string; email: string; name: string; role: string }): UserResponse {
    return { id: user.id, email: user.email, name: user.name, role: user.role as UserResponse['role'] };
}

export function createAuthService(userRepository: IUserRepository): IAuthService {
    return {
        async register(body: RegisterBody): Promise<UserResponse> {
            const existing = await userRepository.findByEmail(body.email);
            if (existing) {
                throw new EmailAlreadyRegisteredError();
            }
            const passwordHash = await bcrypt.hash(body.password, 10);
            const user = await userRepository.create({
                email: body.email,
                passwordHash,
                name: body.name,
            });
            return toUserResponse(user);
        },
        async login(body: LoginBody): Promise<UserResponse> {
            const user = await userRepository.findByEmail(body.email);
            if (!user) {
                throw new InvalidEmailOrPasswordError();
            }
            const valid = await bcrypt.compare(body.password, user.passwordHash);
            if (!valid) {
                throw new InvalidEmailOrPasswordError();
            }
            return toUserResponse(user);
        },
    };
}
