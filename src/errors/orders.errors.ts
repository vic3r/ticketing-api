/**
 * Custom errors for orders flow. Use in routes to map to HTTP status:
 * - SeatsNotFoundError → 404
 * - OrderCreationFailedError → 500
 * - InvalidWebhookSignatureError → 401
 */

export class SeatsNotFoundError extends Error {
    constructor(message = 'One or more seats not found') {
        super(message);
        this.name = 'SeatsNotFoundError';
    }
}

export class OrderCreationFailedError extends Error {
    constructor(message = 'Failed to create order') {
        super(message);
        this.name = 'OrderCreationFailedError';
    }
}

export class InvalidWebhookSignatureError extends Error {
    constructor(message = 'Invalid signature') {
        super(message);
        this.name = 'InvalidWebhookSignatureError';
    }
}
