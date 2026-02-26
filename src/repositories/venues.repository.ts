import { db } from '../db/index.js';
import { venues } from '../db/schema.js';
import { VenueCreationFailedError } from '../errors/venues.errors.js';
import type { IVenuesRepository } from '../interfaces/venues.repository.interface.js';
import type { VenueRequest } from '../dto/venues.dto.js';

export const venuesRepository: IVenuesRepository = {
    async create(input: VenueRequest) {
        const [record] = await db
            .insert(venues)
            .values({
                organizerId: input.organizerId ?? null,
                name: input.name,
                address: input.address,
                city: input.city,
                state: input.state,
                zip: input.zip,
                country: input.country,
                description: input.description ?? null,
            })
            .returning();
        if (!record) throw new VenueCreationFailedError();
        return record;
    },
};
