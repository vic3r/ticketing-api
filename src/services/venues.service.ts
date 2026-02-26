import type { AddSeatsRequest, VenueRequest, VenueResponse } from '../dto/venues.dto.js';
import type { IVenuesRepository } from '../interfaces/venues.repository.interface.js';
import type { IVenuesService } from '../interfaces/venues.service.interface.js';

function toDate(v: Date | string): Date {
    return v instanceof Date ? v : new Date(v);
}

function toVenueResponse(record: {
    id: string;
    organizerId: string | null;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    description: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}): VenueResponse {
    return {
        id: record.id,
        organizerId: record.organizerId,
        name: record.name,
        address: record.address,
        city: record.city,
        state: record.state,
        zip: record.zip,
        country: record.country,
        description: record.description,
        createdAt: toDate(record.createdAt),
        updatedAt: toDate(record.updatedAt),
    };
}

export function createVenuesService(venuesRepository: IVenuesRepository): IVenuesService {
    return {
        async create(input: VenueRequest): Promise<VenueResponse> {
            const record = await venuesRepository.create(input);
            return toVenueResponse(record);
        },
        async addSeats(venueId: string, body: AddSeatsRequest): Promise<{ count: number }> {
            const seats = body.seats ?? [];
            const count = await venuesRepository.addSeats(venueId, seats);
            return { count };
        },
    };
}
