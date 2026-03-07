import type { AddSeatsRequest, VenueRequest, VenueResponse } from '../dto/venues.dto.js';

export interface IVenuesService {
    create(input: VenueRequest): Promise<VenueResponse>;
    findAll(): Promise<VenueResponse[]>;
    findById(id: string): Promise<VenueResponse | null>;
    addSeats(venueId: string, body: AddSeatsRequest): Promise<{ count: number }>;
}
