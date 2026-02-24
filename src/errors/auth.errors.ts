/**
 * Auth errors. Map in routes:
 * - EmailAlreadyRegisteredError → 400
 * - InvalidEmailOrPasswordError → 401
 */

export class EmailAlreadyRegisteredError extends Error {
    constructor(message = 'Email already registered') {
        super(message);
        this.name = 'EmailAlreadyRegisteredError';
    }
}

export class InvalidEmailOrPasswordError extends Error {
    constructor(message = 'Invalid email or password') {
        super(message);
        this.name = 'InvalidEmailOrPasswordError';
    }
}
