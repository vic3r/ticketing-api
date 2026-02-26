export class VenueCreationFailedError extends Error {
    constructor(message = 'Failed to create venue') {
        super(message);
        this.name = 'VenueCreationFailedError';
    }
}
