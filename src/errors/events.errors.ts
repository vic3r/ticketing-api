/**
 * Events errors. Map in routes:
 * - EventCreationFailedError → 500
 * - EventNotFoundError → 404 (optional, when findById returns null)
 */

export class EventCreationFailedError extends Error {
    constructor(message = 'Failed to create event') {
        super(message);
        this.name = 'EventCreationFailedError';
    }
}

export class EventNotFoundError extends Error {
    constructor(message = 'Event not found') {
        super(message);
        this.name = 'EventNotFoundError';
    }
}
