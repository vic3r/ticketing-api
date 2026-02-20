export const registerBodySchema = {
    body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
        },
    },
} as const;